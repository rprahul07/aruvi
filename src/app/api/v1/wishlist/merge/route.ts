import { z } from "zod";
import { requireUser } from "@/lib/auth/authorize";
import { mergeGuestWishlist } from "@/lib/wishlist/wishlist-service";
import { apiError, apiSuccess } from "@/lib/api/response";

const bodySchema = z.object({ productIds: z.array(z.string().uuid()).max(200) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await request.json());
    await mergeGuestWishlist(user.id, body.productIds);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
