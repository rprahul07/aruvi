import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { productUpsertSchema } from "@/lib/validators/admin-product";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("product:manage");
    const body = productUpsertSchema.parse(await request.json());

    const admin = createAdminClient();

    // Enforce slug uniqueness with a friendly error rather than a raw 23505.
    const { data: existing } = await admin.from("products").select("id").eq("slug", body.slug).maybeSingle();
    if (existing) throw new ApiError("SLUG_TAKEN", "A product with this slug already exists", 409);

    const { data, error } = await admin
      .from("products")
      .insert({
        name: body.name,
        slug: body.slug,
        sku: body.sku || null,
        short_description: body.shortDescription || null,
        description: body.description || null,
        category_id: body.categoryId ?? null,
        material: body.material || null,
        metal: body.metal || null,
        occasion: body.occasion || null,
        style: body.style || null,
        base_price: body.basePrice,
        sale_price: body.salePrice ?? null,
        tax_percent: body.taxPercent,
        status: body.status,
      })
      .select("id")
      .single();

    if (error) throw error;

    await writeAuditLog({
      actorId: user.id,
      action: "product.create",
      entityType: "product",
      entityId: data.id,
      afterState: { name: body.name, slug: body.slug, status: body.status },
    });

    return apiSuccess({ id: data.id }, undefined, 201);
  } catch (error) {
    return apiError(error);
  }
}
