import { requireUser } from "@/lib/auth/authorize";
import { verifyCheckoutPayment } from "@/lib/checkout/payment-service";
import { checkoutVerifySchema } from "@/lib/validators/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = checkoutVerifySchema.parse(await request.json());

    // Confirm the order belongs to the requesting user before verifying.
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id")
      .eq("id", body.orderId)
      .maybeSingle();
    if (!order || order.user_id !== user.id) {
      throw new ApiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    const result = await verifyCheckoutPayment(body);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
