import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { updateOrderStatus } from "@/lib/data/admin-orders";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({
  status: z.enum([
    "processing",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "return_requested",
    "returned",
    "refund_pending",
    "refunded",
  ]),
  note: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await requirePermission("order:update_status");
    const { orderId } = await params;
    const body = bodySchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: before } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();

    await updateOrderStatus(orderId, body.status, user.id, body.note);

    await writeAuditLog({
      actorId: user.id,
      action: "order.status_update",
      entityType: "order",
      entityId: orderId,
      beforeState: { status: before?.status },
      afterState: { status: body.status },
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
