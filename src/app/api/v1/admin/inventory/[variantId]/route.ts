import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({
  changeQuantity: z.number().int().refine((n) => n !== 0, "Change cannot be zero"),
  reason: z.enum(["restock", "manual_adjustment", "return"]),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ variantId: string }> }) {
  try {
    const user = await requirePermission("inventory:adjust");
    const { variantId } = await params;
    const body = bodySchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: variant } = await admin
      .from("product_variants")
      .select("id, stock_quantity, reserved_quantity")
      .eq("id", variantId)
      .maybeSingle();

    if (!variant) throw new ApiError("VARIANT_NOT_FOUND", "Variant not found", 404);

    const newStock = variant.stock_quantity + body.changeQuantity;
    if (newStock < variant.reserved_quantity) {
      throw new ApiError(
        "INVALID_ADJUSTMENT",
        `Cannot reduce stock below the ${variant.reserved_quantity} units currently reserved`,
        422,
      );
    }

    await admin.from("product_variants").update({ stock_quantity: newStock }).eq("id", variantId);
    await admin.from("inventory_movements").insert({
      variant_id: variantId,
      change_quantity: body.changeQuantity,
      reason: body.reason,
      reference_type: "manual",
      note: body.note ?? null,
      actor_id: user.id,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "inventory.adjust",
      entityType: "product_variant",
      entityId: variantId,
      beforeState: { stock_quantity: variant.stock_quantity },
      afterState: { stock_quantity: newStock, reason: body.reason },
    });

    return apiSuccess({ stockQuantity: newStock });
  } catch (error) {
    return apiError(error);
  }
}
