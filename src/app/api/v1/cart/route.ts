import { resolveCartIdentity } from "@/lib/cart/identity";
import { getCartView } from "@/lib/cart/cart-service";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const identity = await resolveCartIdentity();
    const cart = await getCartView(identity);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}
