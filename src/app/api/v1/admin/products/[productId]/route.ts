import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { productUpsertSchema } from "@/lib/validators/admin-product";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requirePermission("product:manage");
    const { productId } = await params;
    const body = productUpsertSchema.parse(await request.json());

    const admin = createAdminClient();

    const { data: before } = await admin
      .from("products")
      .select("id, slug, status, base_price, sale_price")
      .eq("id", productId)
      .maybeSingle();
    if (!before) throw new ApiError("PRODUCT_NOT_FOUND", "Product not found", 404);

    // Slug uniqueness against other products.
    const { data: slugOwner } = await admin
      .from("products")
      .select("id")
      .eq("slug", body.slug)
      .neq("id", productId)
      .maybeSingle();
    if (slugOwner) throw new ApiError("SLUG_TAKEN", "A product with this slug already exists", 409);

    const { error } = await admin
      .from("products")
      .update({
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
      .eq("id", productId);

    if (error) throw error;

    await writeAuditLog({
      actorId: user.id,
      action: "product.update",
      entityType: "product",
      entityId: productId,
      beforeState: {
        slug: before.slug,
        status: before.status,
        base_price: before.base_price,
        sale_price: before.sale_price,
      },
      afterState: { slug: body.slug, status: body.status, base_price: body.basePrice, sale_price: body.salePrice },
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requirePermission("product:manage");
    const { productId } = await params;

    const admin = createAdminClient();
    // Archive rather than hard-delete so historical orders keep their product refs.
    const { error } = await admin.from("products").update({ status: "archived" }).eq("id", productId);
    if (error) throw error;

    await writeAuditLog({
      actorId: user.id,
      action: "product.archive",
      entityType: "product",
      entityId: productId,
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
