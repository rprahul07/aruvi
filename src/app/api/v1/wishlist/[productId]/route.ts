import { requireUser } from "@/lib/auth/authorize";
import { removeFromWishlist } from "@/lib/wishlist/wishlist-service";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await requireUser();
    const { productId } = await params;
    await removeFromWishlist(user.id, productId);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
