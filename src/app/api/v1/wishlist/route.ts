import { z } from "zod";
import { requireUser } from "@/lib/auth/authorize";
import { addToWishlist, getWishlistProductIds } from "@/lib/wishlist/wishlist-service";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({ productId: z.string().uuid() });

export async function GET() {
  try {
    const user = await requireUser();
    const productIds = await getWishlistProductIds(user.id);
    return apiSuccess({ productIds });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await request.json());
    await addToWishlist(user.id, body.productId);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
