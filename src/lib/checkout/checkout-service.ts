import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCartView } from "@/lib/cart/cart-service";
import { createRazorpayOrder } from "@/lib/razorpay/client";
import { ApiError } from "@/lib/api/response";
import type { CartIdentity } from "@/lib/cart/identity";

const RESERVATION_MINUTES = 15;

export interface CheckoutInitResult {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number; // in paise, for Razorpay Checkout
  currency: string;
  keyId: string;
}

interface CheckoutAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  district?: string | null;
  state: string;
  postalCode: string;
  country?: string;
}

/**
 * Creates an authoritative pending order from the user's server-side cart,
 * atomically reserves inventory, then creates a matching Razorpay order.
 *
 * Nothing here trusts a client-supplied total: the payable amount is
 * recomputed from the cart (which itself recomputes from live prices and
 * a server-validated coupon). If any reservation fails, all prior
 * reservations for this attempt are rolled back before we error out.
 */
export async function initiateCheckout(
  identity: CartIdentity,
  userId: string,
  shippingAddress: CheckoutAddressInput,
): Promise<CheckoutInitResult> {
  const admin = createAdminClient();

  const cart = await getCartView(identity);
  if (cart.items.length === 0) {
    throw new ApiError("EMPTY_CART", "Your bag is empty", 422);
  }

  // Re-fetch each variant's live price + category to build authoritative line items.
  const variantIds = cart.items.map((i) => i.variantId);
  const { data: variants, error: variantError } = await admin
    .from("product_variants")
    .select("id, sku, price, sale_price, is_active, products(id, name, tax_percent, product_images(url, is_cover, variant_id))")
    .in("id", variantIds);

  if (variantError) throw variantError;

  const variantMap = new Map((variants ?? []).map((v) => [v.id, v]));

  // Resolve applied coupon (if any) from the cart row.
  const { data: cartRow } = await admin
    .from("carts")
    .select("id, coupon_id, coupons(code)")
    .eq("id", cart.id)
    .maybeSingle();

  // Build order line items from authoritative data.
  const orderItems = cart.items.map((item) => {
    const variant = variantMap.get(item.variantId);
    if (!variant || !variant.is_active) {
      throw new ApiError("PRODUCT_UNAVAILABLE", `${item.productName} is no longer available`, 409);
    }
    const unitPrice = variant.sale_price != null ? Number(variant.sale_price) : Number(variant.price);
    const product = variant.products as unknown as {
      id: string;
      name: string;
      tax_percent: number;
      product_images: { url: string; is_cover: boolean; variant_id: string | null }[];
    };
    const images = product.product_images ?? [];
    const variantImg = images.filter((img) => img.variant_id === variant.id);
    const productImg = images.filter((img) => img.variant_id === null);
    const cover =
      variantImg.find((i) => i.is_cover) ?? variantImg[0] ?? productImg.find((i) => i.is_cover) ?? productImg[0];

    const lineSubtotal = Math.round(unitPrice * item.quantity * 100) / 100;

    return {
      variantId: item.variantId,
      productId: product.id,
      productName: product.name,
      variantLabel: item.variantLabel,
      sku: variant.sku,
      imageUrl: cover?.url ?? null,
      unitPrice,
      quantity: item.quantity,
      lineSubtotal,
      taxPercent: Number(product.tax_percent),
    };
  });

  // Distribute cart-level discount proportionally across lines for record-keeping.
  const subtotal = orderItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
  const discountTotal = cart.discount;

  // Create the pending order first (so we have an id for movement references).
  const reservationExpiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000).toISOString();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      status: "pending",
      payment_status: "created",
      subtotal_amount: cart.subtotal,
      discount_amount: cart.discount,
      tax_amount: cart.tax,
      shipping_amount: cart.shipping,
      total_amount: cart.total,
      currency: cart.currency ?? "INR",
      coupon_id: cartRow?.coupon_id ?? null,
      coupon_code: (cartRow?.coupons as { code: string } | null)?.code ?? null,
      reservation_expires_at: reservationExpiresAt,
    })
    .select("id, order_number")
    .single();

  if (orderError) throw orderError;

  // Reserve stock for every line, atomically. Roll back on first failure.
  const reserved: { variantId: string; quantity: number }[] = [];
  for (const item of orderItems) {
    const { data: ok, error: reserveError } = await admin.rpc("reserve_variant_stock", {
      p_variant_id: item.variantId,
      p_qty: item.quantity,
      p_reference_id: order.id,
    });

    if (reserveError || !ok) {
      // Roll back prior reservations and the order.
      for (const r of reserved) {
        await admin.rpc("release_variant_stock", {
          p_variant_id: r.variantId,
          p_qty: r.quantity,
          p_reference_id: order.id,
        });
      }
      await admin.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", order.id);
      throw new ApiError("INSUFFICIENT_STOCK", `${item.productName} is out of stock`, 409);
    }
    reserved.push({ variantId: item.variantId, quantity: item.quantity });
  }

  // Persist order items with proportional discount + tax breakdown.
  const orderItemRows = orderItems.map((item) => {
    const share = subtotal > 0 ? item.lineSubtotal / subtotal : 0;
    const lineDiscount = Math.round(discountTotal * share * 100) / 100;
    const lineTaxable = item.lineSubtotal - lineDiscount;
    const lineTax = Math.round(lineTaxable * (item.taxPercent / 100) * 100) / 100;
    return {
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_label: item.variantLabel,
      sku: item.sku,
      image_url: item.imageUrl,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_subtotal: item.lineSubtotal,
      line_discount: lineDiscount,
      line_tax: lineTax,
      line_total: Math.round((lineTaxable + lineTax) * 100) / 100,
    };
  });
  await admin.from("order_items").insert(orderItemRows);

  // Snapshot the shipping address onto the order.
  await admin.from("order_addresses").insert({
    order_id: order.id,
    address_type: "shipping",
    full_name: shippingAddress.fullName,
    phone: shippingAddress.phone,
    line1: shippingAddress.line1,
    line2: shippingAddress.line2 ?? null,
    landmark: shippingAddress.landmark ?? null,
    city: shippingAddress.city,
    district: shippingAddress.district ?? null,
    state: shippingAddress.state,
    postal_code: shippingAddress.postalCode,
    country: shippingAddress.country ?? "IN",
  });

  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: "pending",
    note: "Order created, awaiting payment",
  });

  // Create the Razorpay order for the authoritative amount (in paise).
  // If this fails, release the reservations and cancel the order immediately
  // rather than leaving stock held until the expiry sweep runs.
  const amountPaise = Math.round(cart.total * 100);
  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amount: amountPaise,
      currency: cart.currency ?? "INR",
      receipt: order.order_number,
      notes: { orderId: order.id, userId },
    });
  } catch (err) {
    for (const r of reserved) {
      await admin.rpc("release_variant_stock", {
        p_variant_id: r.variantId,
        p_qty: r.quantity,
        p_reference_id: order.id,
      });
    }
    await admin.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", order.id);
    throw new ApiError("PAYMENT_INIT_FAILED", "Could not start payment. Please try again.", 502);
  }

  // Record the payment intent.
  await admin.from("payments").insert({
    order_id: order.id,
    provider: "razorpay",
    provider_order_id: razorpayOrder.id,
    status: "created",
    amount: cart.total,
    currency: cart.currency ?? "INR",
  });

  await admin.from("orders").update({ payment_status: "pending" }).eq("id", order.id);

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: cart.currency ?? "INR",
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}
