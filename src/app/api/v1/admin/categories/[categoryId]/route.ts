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

export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  try {
    const user = await requirePermission("product:manage");
    const { categoryId } = await params;
    const body = bodySchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: slugOwner } = await admin
      .from("categories")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", categoryId)
      .maybeSingle();
    if (slugOwner) throw new ApiError("SLUG_TAKEN", "A category with this slug already exists", 409);

    const { error } = await admin
      .from("categories")
      .update({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        sort_order: body.sortOrder,
        is_active: body.isActive,
      })
      .eq("id", categoryId);

    if (error) throw error;

    await writeAuditLog({
      actorId: user.id,
      action: "category.update",
      entityType: "category",
      entityId: categoryId,
      afterState: { name: body.name, slug: body.slug, isActive: body.isActive },
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
