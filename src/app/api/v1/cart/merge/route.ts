import { clearGuestCartCookie, resolveCartIdentity } from "@/lib/cart/identity";
import { getCartView, mergeGuestCartIntoUser } from "@/lib/cart/cart-service";
import { apiError, apiSuccess } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/authorize";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const user = await requireUser();
    const cookieStore = await cookies();
    const guestToken = cookieStore.get("aurvi_guest_cart")?.value ?? null;

    await mergeGuestCartIntoUser(user.id, guestToken);
    await clearGuestCartCookie();

    const cart = await getCartView(await resolveCartIdentity());
    return apiSuccess(cart);
  } catch (error) {
    return apiError(error);
  }
}
