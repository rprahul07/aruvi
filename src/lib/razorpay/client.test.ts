import { describe, it, expect, beforeEach } from "vitest";
import crypto from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "./client";

const KEY_SECRET = "test_secret_key";
const WEBHOOK_SECRET = "test_webhook_secret";

beforeEach(() => {
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

describe("verifyPaymentSignature", () => {
  it("accepts a correctly signed payment", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const signature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
  });

  it("rejects a tampered amount/payment id", () => {
    const orderId = "order_ABC123";
    const signature = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${orderId}|pay_REAL`)
      .digest("hex");

    expect(
      verifyPaymentSignature({ orderId, paymentId: "pay_FORGED", signature }),
    ).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";
    const signature = crypto
      .createHmac("sha256", "wrong_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed webhook body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects a modified webhook body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    const tampered = JSON.stringify({ event: "payment.captured", extra: "injected" });
    expect(verifyWebhookSignature(tampered, signature)).toBe(false);
  });
});
