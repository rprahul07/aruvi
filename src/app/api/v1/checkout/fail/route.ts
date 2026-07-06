import { requireUser } from "@/lib/auth/authorize";
import { markCheckoutFailed } from "@/lib/checkout/payment-service";
import { checkoutFailSchema } from "@/lib/validators/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = checkoutFailSchema.parse(await request.json());

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id")
      .eq("id", body.orderId)
      .maybeSingle();
    if (!order || order.user_id !== user.id) {
      throw new ApiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    await markCheckoutFailed(body.orderId, body.reason);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
