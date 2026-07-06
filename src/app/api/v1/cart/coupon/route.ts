import { z } from "zod";
import { resolveCartIdentity } from "@/lib/cart/identity";
import { applyCartCoupon, removeCartCoupon } from "@/lib/cart/cart-service";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({ code: z.string().min(1).max(64) });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const identity = await resolveCartIdentity();
    const cart = await applyCartCoupon(identity, body.code);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const identity = await resolveCartIdentity();
    const cart = await removeCartCoupon(identity);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}
