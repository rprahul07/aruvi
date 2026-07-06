import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCoupon, type CouponLineItem } from "@/lib/cart/coupon";
import type { CartIdentity } from "@/lib/cart/identity";
import type { CartView } from "@/types/domain";
import { ApiError } from "@/lib/api/response";

const EMPTY_CART: Omit<CartView, "id"> = {
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  currency: "INR",
  couponCode: null,
  itemCount: 0,
};

async function findCartRow(identity: CartIdentity) {
  const admin = createAdminClient();
  const query = admin.from("carts").select("id, coupon_id, coupons(code)").eq("status", "active");

  const { data, error } = identity.userId
    ? await query.eq("user_id", identity.userId).maybeSingle()
    : identity.guestToken
      ? await query.eq("guest_token", identity.guestToken).maybeSingle()
      : { data: null, error: null };

  if (error) throw error;
  return data;
}

async function getOrCreateCartRow(identity: CartIdentity) {
  const existing = await findCartRow(identity);
  if (existing) return existing;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("carts")
    .insert(
      identity.userId ? { user_id: identity.userId } : { guest_token: identity.guestToken },
    )
    .select("id, coupon_id, coupons(code)")
    .single();

  if (error) throw error;
  return data;
}

async function fetchShippingSettings() {
  const admin = createAdminClient();
  const { data } = await admin.from("store_settings").select("value").eq("key", "shipping").maybeSingle();
  const value = (data?.value as { flatFee?: number; freeAboveAmount?: number } | undefined) ?? {};
  return { flatFee: value.flatFee ?? 99, freeAboveAmount: value.freeAboveAmount ?? 2000 };
}

interface CartItemRow {
  id: string;
  quantity: number;
  product_variants: {
    id: string;
    sku: string;
    price: number;
    sale_price: number | null;
    stock_quantity: number;
    reserved_quantity: number;
    is_active: boolean;
    products: {
      id: string;
      name: string;
      slug: string;
      tax_percent: number;
      category_id: string | null;
      product_images: { url: string; is_cover: boolean; variant_id: string | null }[];
    };
    variant_attribute_values: { attribute_values: { value: string } }[];
  } | null;
}

async function buildCartView(
  cartId: string,
  couponCode: string | null,
  userId: string | null,
): Promise<CartView> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("cart_items")
    .select(
      `
      id, quantity,
      product_variants (
        id, sku, price, sale_price, stock_quantity, reserved_quantity, is_active,
        products ( id, name, slug, tax_percent, category_id, product_images ( url, is_cover, variant_id ) ),
        variant_attribute_values ( attribute_values ( value ) )
      )
    `,
    )
    .eq("cart_id", cartId);

  if (error) throw error;

  const rowsTyped = rows as unknown as CartItemRow[];
  const validRows = rowsTyped.filter((r) => r.product_variants != null);

  const items = validRows.map((row) => {
    const v = row.product_variants!;
    const unitPrice = v.sale_price != null ? Number(v.sale_price) : Number(v.price);
    const availableQuantity = Math.max(0, v.stock_quantity - v.reserved_quantity);
    const variantImages = v.products.product_images.filter((img) => img.variant_id === v.id);
    const productImages = v.products.product_images.filter((img) => img.variant_id === null);
    const cover =
      variantImages.find((img) => img.is_cover) ??
      variantImages[0] ??
      productImages.find((img) => img.is_cover) ??
      productImages[0];
    const variantLabel = v.variant_attribute_values.map((vav) => vav.attribute_values.value).join(" · ");

    return {
      id: row.id,
      variantId: v.id,
      productId: v.products.id,
      productName: v.products.name,
      productSlug: v.products.slug,
      variantLabel,
      image: cover?.url ?? null,
      unitPrice,
      quantity: row.quantity,
      availableQuantity,
      lineTotal: Math.round(unitPrice * row.quantity * 100) / 100,
      _categoryId: v.products.category_id,
      _taxPercent: Number(v.products.tax_percent),
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  let discount = 0;
  let freeShipping = false;

  if (couponCode && items.length > 0) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const { data: collectionRows } = await admin
      .from("product_collections")
      .select("product_id, collection_id")
      .in("product_id", productIds);

    const collectionsByProduct = new Map<string, string[]>();
    for (const row of collectionRows ?? []) {
      const list = collectionsByProduct.get(row.product_id) ?? [];
      list.push(row.collection_id);
      collectionsByProduct.set(row.product_id, list);
    }

    const couponItems: CouponLineItem[] = items.map((i) => ({
      productId: i.productId,
      categoryId: i._categoryId,
      collectionIds: collectionsByProduct.get(i.productId) ?? [],
      lineSubtotal: i.lineTotal,
    }));

    const evaluation = await evaluateCoupon(admin, couponCode, userId, couponItems).catch(() => null);
    if (evaluation?.valid) {
      discount = evaluation.discountAmount;
      freeShipping = evaluation.freeShipping;
    }
  }

  const taxableBase = Math.max(0, subtotal - discount);
  const tax =
    subtotal > 0
      ? items.reduce((sum, i) => {
          const share = i.lineTotal / subtotal;
          const itemTaxable = taxableBase * share;
          return sum + itemTaxable * (i._taxPercent / 100);
        }, 0)
      : 0;

  const { flatFee, freeAboveAmount } = await fetchShippingSettings();
  const shipping = freeShipping || taxableBase >= freeAboveAmount || items.length === 0 ? 0 : flatFee;

  const total = Math.round((taxableBase + tax + shipping) * 100) / 100;

  return {
    id: cartId,
    items: items.map(({ _categoryId, _taxPercent, ...rest }) => rest),
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping,
    total,
    currency: "INR",
    couponCode,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export async function getCartView(identity: CartIdentity): Promise<CartView> {
  const row = await findCartRow(identity);
  if (!row) return { id: "", ...EMPTY_CART };
  return buildCartView(row.id, (row.coupons as { code: string } | null)?.code ?? null, identity.userId);
}

export async function addCartItem(identity: CartIdentity, variantId: string, quantity: number): Promise<CartView> {
  if (quantity <= 0) throw new ApiError("INVALID_QUANTITY", "Quantity must be positive", 422);

  const admin = createAdminClient();
  const { data: variant, error: variantError } = await admin
    .from("product_variants")
    .select("id, stock_quantity, reserved_quantity, is_active")
    .eq("id", variantId)
    .maybeSingle();

  if (variantError) throw variantError;
  if (!variant || !variant.is_active) {
    throw new ApiError("PRODUCT_UNAVAILABLE", "This item is no longer available", 404);
  }

  const cart = await getOrCreateCartRow(identity);

  const { data: existing } = await admin
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("variant_id", variantId)
    .maybeSingle();

  const desiredQuantity = (existing?.quantity ?? 0) + quantity;
  const available = variant.stock_quantity - variant.reserved_quantity;
  if (desiredQuantity > available) {
    throw new ApiError(
      "INSUFFICIENT_STOCK",
      available > 0 ? `Only ${available} left in stock` : "This item is out of stock",
      409,
    );
  }

  if (existing) {
    await admin.from("cart_items").update({ quantity: desiredQuantity }).eq("id", existing.id);
  } else {
    await admin.from("cart_items").insert({ cart_id: cart.id, variant_id: variantId, quantity });
  }

  return buildCartView(cart.id, (cart.coupons as { code: string } | null)?.code ?? null, identity.userId);
}

export async function updateCartItemQuantity(
  identity: CartIdentity,
  itemId: string,
  quantity: number,
): Promise<CartView> {
  const cart = await findCartRow(identity);
  if (!cart) throw new ApiError("CART_NOT_FOUND", "Cart not found", 404);

  const admin = createAdminClient();

  if (quantity <= 0) {
    await admin.from("cart_items").delete().eq("id", itemId).eq("cart_id", cart.id);
    return buildCartView(cart.id, (cart.coupons as { code: string } | null)?.code ?? null, identity.userId);
  }

  const { data: item } = await admin
    .from("cart_items")
    .select("id, variant_id, product_variants(stock_quantity, reserved_quantity)")
    .eq("id", itemId)
    .eq("cart_id", cart.id)
    .maybeSingle();

  if (!item) throw new ApiError("ITEM_NOT_FOUND", "Cart item not found", 404);

  const variant = item.product_variants as unknown as { stock_quantity: number; reserved_quantity: number } | null;
  const available = variant ? variant.stock_quantity - variant.reserved_quantity : 0;
  if (quantity > available) {
    throw new ApiError("INSUFFICIENT_STOCK", `Only ${available} left in stock`, 409);
  }

  await admin.from("cart_items").update({ quantity }).eq("id", itemId);
  return buildCartView(cart.id, (cart.coupons as { code: string } | null)?.code ?? null, identity.userId);
}

export async function removeCartItem(identity: CartIdentity, itemId: string): Promise<CartView> {
  return updateCartItemQuantity(identity, itemId, 0);
}

export async function applyCartCoupon(identity: CartIdentity, code: string): Promise<CartView> {
  if (!identity.userId) {
    throw new ApiError("SIGN_IN_REQUIRED", "Sign in to apply a coupon code", 401);
  }

  const cart = await getOrCreateCartRow(identity);
  const admin = createAdminClient();

  const view = await buildCartView(cart.id, null, identity.userId);
  if (view.items.length === 0) {
    throw new ApiError("EMPTY_CART", "Add items to your cart before applying a coupon", 422);
  }

  const productIds = [...new Set(view.items.map((i) => i.productId))];

  const { data: productRows } = await admin
    .from("products")
    .select("id, category_id")
    .in("id", productIds);
  const categoryByProduct = new Map<string, string | null>(
    (productRows ?? []).map((p) => [p.id, p.category_id]),
  );

  const { data: collectionRows } = await admin
    .from("product_collections")
    .select("product_id, collection_id")
    .in("product_id", productIds);
  const collectionsByProduct = new Map<string, string[]>();
  for (const row of collectionRows ?? []) {
    const list = collectionsByProduct.get(row.product_id) ?? [];
    list.push(row.collection_id);
    collectionsByProduct.set(row.product_id, list);
  }

  const couponItems: CouponLineItem[] = view.items.map((i) => ({
    productId: i.productId,
    categoryId: categoryByProduct.get(i.productId) ?? null,
    collectionIds: collectionsByProduct.get(i.productId) ?? [],
    lineSubtotal: i.lineTotal,
  }));

  const evaluation = await evaluateCoupon(admin, code, identity.userId, couponItems);
  if (!evaluation.valid) {
    throw new ApiError("COUPON_INVALID", evaluation.message ?? "Coupon is not valid", 422);
  }

  await admin.from("carts").update({ coupon_id: evaluation.couponId }).eq("id", cart.id);
  return buildCartView(cart.id, code.trim().toUpperCase(), identity.userId);
}

export async function removeCartCoupon(identity: CartIdentity): Promise<CartView> {
  const cart = await findCartRow(identity);
  if (!cart) return { id: "", ...EMPTY_CART };

  const admin = createAdminClient();
  await admin.from("carts").update({ coupon_id: null }).eq("id", cart.id);
  return buildCartView(cart.id, null, identity.userId);
}

/** Merges a guest cart into the signed-in user's cart right after login. */
export async function mergeGuestCartIntoUser(userId: string, guestToken: string | null): Promise<void> {
  if (!guestToken) return;

  const admin = createAdminClient();
  const { data: guestCart } = await admin
    .from("carts")
    .select("id")
    .eq("guest_token", guestToken)
    .eq("status", "active")
    .maybeSingle();

  if (!guestCart) return;

  const { data: userCart } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const { data: guestItems } = await admin
    .from("cart_items")
    .select("variant_id, quantity")
    .eq("cart_id", guestCart.id);

  if (!guestItems || guestItems.length === 0) {
    await admin.from("carts").delete().eq("id", guestCart.id);
    return;
  }

  const targetCartId = userCart
    ? userCart.id
    : (
        await admin
          .from("carts")
          .insert({ user_id: userId })
          .select("id")
          .single()
      ).data!.id;

  for (const item of guestItems) {
    const { data: existing } = await admin
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", targetCartId)
      .eq("variant_id", item.variant_id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("cart_items")
        .update({ quantity: existing.quantity + item.quantity })
        .eq("id", existing.id);
    } else {
      await admin
        .from("cart_items")
        .insert({ cart_id: targetCartId, variant_id: item.variant_id, quantity: item.quantity });
    }
  }

  await admin.from("carts").delete().eq("id", guestCart.id);
}
