import { z } from "zod";

export const productUpsertSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens"),
  sku: z.string().max(64).optional().or(z.literal("")),
  shortDescription: z.string().max(300).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().nullable(),
  material: z.string().max(120).optional().or(z.literal("")),
  metal: z.string().max(120).optional().or(z.literal("")),
  occasion: z.string().max(120).optional().or(z.literal("")),
  style: z.string().max(120).optional().or(z.literal("")),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional().nullable(),
  taxPercent: z.number().min(0).max(100).default(3),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

export type ProductUpsertInput = z.infer<typeof productUpsertSchema>;

export const variantUpsertSchema = z.object({
  sku: z.string().min(1).max(64),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional().nullable(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(3),
  isActive: z.boolean().default(true),
});
