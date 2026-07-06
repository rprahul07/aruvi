import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens"),
  description: z.string().max(500).optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("product:manage");
    const body = bodySchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: existing } = await admin.from("categories").select("id").eq("slug", body.slug).maybeSingle();
    if (existing) throw new ApiError("SLUG_TAKEN", "A category with this slug already exists", 409);

    const { data, error } = await admin
      .from("categories")
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        sort_order: body.sortOrder,
        is_active: body.isActive,
      })
      .select("id")
      .single();

    if (error) throw error;

    await writeAuditLog({
      actorId: user.id,
      action: "category.create",
      entityType: "category",
      entityId: data.id,
      afterState: { name: body.name, slug: body.slug },
    });

    return apiSuccess({ id: data.id }, undefined, 201);
  } catch (error) {
    return apiError(error);
  }
}
