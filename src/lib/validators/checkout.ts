import { z } from "zod";

export const checkoutInitiateSchema = z.object({
  addressId: z.string().uuid().optional(),
  // Either an existing addressId, or a full inline address, must be provided.
  address: z
    .object({
      fullName: z.string().min(2),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      line1: z.string().min(3),
      line2: z.string().optional().nullable(),
      landmark: z.string().optional().nullable(),
      city: z.string().min(2),
      district: z.string().optional().nullable(),
      state: z.string().min(2),
      postalCode: z.string().regex(/^[1-9][0-9]{5}$/),
      country: z.string().optional(),
    })
    .optional(),
});

export const checkoutVerifySchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const checkoutFailSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().max(200).default("cancelled_by_user"),
});
