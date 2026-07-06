import { z } from "zod";
import { resolveOrCreateCartIdentity } from "@/lib/cart/identity";
import { removeCartItem, updateCartItemQuantity } from "@/lib/cart/cart-service";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const body = bodySchema.parse(await request.json());
    const identity = await resolveOrCreateCartIdentity();
    const cart = await updateCartItemQuantity(identity, itemId, body.quantity);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    const identity = await resolveOrCreateCartIdentity();
    const cart = await removeCartItem(identity, itemId);
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}
