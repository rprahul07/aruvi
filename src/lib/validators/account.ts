import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
});

const indianPostalCode = z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code");
const indianPhone = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

export const addressSchema = z.object({
  fullName: z.string().min(2, "Enter the recipient's name").max(120),
  phone: indianPhone,
  alternatePhone: indianPhone.optional().or(z.literal("")),
  line1: z.string().min(3, "Enter the address").max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  landmark: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(2, "Enter the city").max(100),
  district: z.string().max(100).optional().or(z.literal("")),
  state: z.string().min(2, "Enter the state").max(100),
  postalCode: indianPostalCode,
  addressType: z.enum(["home", "work", "other"]).default("home"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
