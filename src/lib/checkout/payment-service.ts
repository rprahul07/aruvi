import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay/client";
import { ApiError } from "@/lib/api/response";

/**
 * Commits reserved stock and marks the order paid — idempotently.
 *
 * Both the client callback (verifyCheckoutPayment) and the webhook
 * (handlePaymentCaptured) funnel here. The first caller to move the order
 * out of a non-captured payment_status wins; a second call (duplicate
 * webhook, user refresh) sees payment_status already 'captured' and
 * returns without double-committing inventory or double-firing side effects.
 */
async function markOrderPaid(orderId: string, providerPaymentId: string, method?: string): Promise<boolean> {
  const admin = createAdminClient();

  // Atomically CLAIM the order: transition payment_status → captured only if
  // it isn't already captured. Postgres serializes this UPDATE, so of two
  // concurrent callers (client verify + webhook) exactly one gets a row back
  // and proceeds; the loser sees zero rows and returns a no-op. This is what
  // prevents a double-commit of inventory and duplicate side effects.
  const { data: claimed, error } = await admin
    .from("orders")
    .update({ payment_status: "captured", status: "confirmed", reservation_expires_at: null })
    .eq("id", orderId)
    .neq("payment_status", "captured")
    .select("id, user_id, coupon_id");

  if (error) throw error;
  if (!claimed || claimed.length === 0) {
    // Either already captured (idempotent no-op) or the order doesn't exist.
    return false;
  }
  const order = claimed[0]!;

  // Commit reserved stock for every line item.
  const { data: items } = await admin
    .from("order_items")
    .select("variant_id, quantity")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    if (item.variant_id) {
      await admin.rpc("commit_variant_stock", {
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
        p_reference_id: orderId,
      });
    }
  }

  await admin
    .from("payments")
    .update({ status: "captured", provider_payment_id: providerPaymentId, method: method ?? null })
    .eq("order_id", orderId);

  await admin.from("order_status_history").insert({
    order_id: orderId,
    status: "confirmed",
    note: "Payment captured",
  });

  // Redeem the coupon (if any) now that the order is confirmed.
  if (order.coupon_id) {
    await admin.from("coupon_redemptions").insert({
      coupon_id: order.coupon_id,
      user_id: order.user_id,
      order_id: orderId,
    });
  }

  // Mark the cart converted so a fresh one is created for the next visit.
  await admin.from("carts").update({ status: "converted" }).eq("user_id", order.user_id).eq("status", "active");

  // In-app confirmation notification (email/SMS/WhatsApp would hook in here).
  await admin.from("notifications").insert({
    user_id: order.user_id,
    type: "order_confirmed",
    title: "Order confirmed",
    body: "Thank you! Your payment was received and your order is confirmed.",
    data: { orderId },
  });

  // Analytics purchase event.
  await admin.from("analytics_events").insert({
    event_name: "purchase",
    user_id: order.user_id,
    payload: { orderId, paymentId: providerPaymentId },
  });

  return true;
}

/** Verifies the client-side Razorpay callback and marks the order paid. */
export async function verifyCheckoutPayment(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ paid: boolean }> {
  const admin = createAdminClient();

  // Confirm the razorpay order id belongs to this internal order — never
  // trust the client's mapping alone.
  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id, provider_order_id")
    .eq("order_id", params.orderId)
    .eq("provider_order_id", params.razorpayOrderId)
    .maybeSingle();

  if (!payment) {
    throw new ApiError("PAYMENT_NOT_FOUND", "No matching payment for this order", 404);
  }

  const valid = verifyPaymentSignature({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
  });

  if (!valid) {
    await admin
      .from("payments")
      .update({ status: "failed", failure_reason: "signature_mismatch" })
      .eq("id", payment.id);
    throw new ApiError("SIGNATURE_INVALID", "Payment verification failed", 400);
  }

  await markOrderPaid(params.orderId, params.razorpayPaymentId);
  return { paid: true };
}

/** Marks a checkout payment failed (user closed modal, card declined, etc.). */
export async function markCheckoutFailed(orderId: string, reason: string): Promise<void> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.payment_status === "captured") return;

  // Release reserved stock.
  const { data: items } = await admin.from("order_items").select("variant_id, quantity").eq("order_id", orderId);
  for (const item of items ?? []) {
    if (item.variant_id) {
      await admin.rpc("release_variant_stock", {
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
        p_reference_id: orderId,
      });
    }
  }

  await admin.from("orders").update({ payment_status: "failed", status: "cancelled" }).eq("id", orderId);
  await admin.from("payments").update({ status: "failed", failure_reason: reason }).eq("order_id", orderId);
  await admin.from("order_status_history").insert({
    order_id: orderId,
    status: "cancelled",
    note: `Payment failed: ${reason}`,
  });
}

/** Webhook: payment captured. Idempotent via markOrderPaid + payment_events unique constraint. */
export async function handleWebhookPaymentCaptured(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  method?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("order_id")
    .eq("provider_order_id", razorpayOrderId)
    .maybeSingle();

  if (!payment) return; // unknown order — ignore
  await markOrderPaid(payment.order_id, razorpayPaymentId, method);
}

/** Webhook: payment failed. */
export async function handleWebhookPaymentFailed(razorpayOrderId: string, reason: string): Promise<void> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("order_id")
    .eq("provider_order_id", razorpayOrderId)
    .maybeSingle();

  if (!payment) return;
  await markCheckoutFailed(payment.order_id, reason);
}
