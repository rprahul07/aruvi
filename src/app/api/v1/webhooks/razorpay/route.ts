import { verifyWebhookSignature } from "@/lib/razorpay/client";
import {
  handleWebhookPaymentCaptured,
  handleWebhookPaymentFailed,
} from "@/lib/checkout/payment-service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Razorpay webhook receiver. This is the independent, authoritative
 * confirmation of payment state — the order is never marked paid on the
 * strength of the client callback alone.
 *
 * Guarantees:
 * - Signature-verified against RAZORPAY_WEBHOOK_SECRET before any work.
 * - Idempotent: every event is recorded in payment_events with a UNIQUE
 *   (provider, provider_event_id) constraint; a duplicate delivery is
 *   detected and skipped. markOrderPaid is itself idempotent as a second
 *   line of defense.
 * - Always returns 2xx once the signature is valid, so Razorpay does not
 *   retry storms on transient downstream errors we've already logged.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  const rawBody = await request.text();

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyWebhookSignature(rawBody, signature);
  } catch {
    // Secret not configured — reject rather than silently accept.
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500 });
  }

  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; method?: string; error_description?: string } };
    };
  };

  const admin = createAdminClient();

  // Derive a stable event id for idempotency. Razorpay does not send a
  // guaranteed-unique event id in the body for all versions, so we build
  // one from the event type + payment id, which is unique per state change.
  const paymentEntity = event.payload?.payment?.entity;
  const providerEventId = `${event.event}:${paymentEntity?.id ?? crypto.randomUUID()}`;

  // Record the event; the unique constraint gives us idempotency.
  const { error: insertError } = await admin.from("payment_events").insert({
    provider: "razorpay",
    provider_event_id: providerEventId,
    event_type: event.event,
    payload: JSON.parse(rawBody),
  });

  if (insertError) {
    // Duplicate (already processed) — acknowledge without reprocessing.
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    console.error("Failed to record payment event", insertError);
    return new Response(JSON.stringify({ error: "Storage error" }), { status: 500 });
  }

  try {
    if (event.event === "payment.captured" && paymentEntity?.order_id) {
      await handleWebhookPaymentCaptured(paymentEntity.order_id, paymentEntity.id ?? "", paymentEntity.method);
    } else if (event.event === "payment.failed" && paymentEntity?.order_id) {
      await handleWebhookPaymentFailed(paymentEntity.order_id, paymentEntity.error_description ?? "payment_failed");
    }

    await admin.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("provider_event_id", providerEventId);
  } catch (error) {
    console.error("Webhook processing error", error);
    // Still 200 — the event is recorded; a manual/scheduled reconciliation
    // can retry. Returning 5xx would trigger Razorpay retries that hit the
    // idempotency guard anyway.
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
