import { z } from "zod";
import { resolveOrCreateCartIdentity } from "@/lib/cart/identity";
import { addCartItem } from "@/lib/cart/cart-service";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const identity = await resolveOrCreateCartIdentity();
    const cart = await addCartItem(identity, body.variantId, body.quantity);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}
