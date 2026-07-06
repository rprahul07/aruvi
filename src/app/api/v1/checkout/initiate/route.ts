import { requireUser } from "@/lib/auth/authorize";
import { resolveCartIdentity } from "@/lib/cart/identity";
import { initiateCheckout } from "@/lib/checkout/checkout-service";
import { checkoutInitiateSchema } from "@/lib/validators/checkout";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError, apiError, apiSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = checkoutInitiateSchema.parse(await request.json());

    // Resolve the shipping address: a saved address (verified to belong to
    // the user) or an inline one.
    let shippingAddress;
    if (body.addressId) {
      const admin = createAdminClient();
      const { data: addr } = await admin
        .from("addresses")
        .select("*")
        .eq("id", body.addressId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!addr) throw new ApiError("ADDRESS_NOT_FOUND", "Address not found", 404);
      shippingAddress = {
        fullName: addr.full_name,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2,
        landmark: addr.landmark,
        city: addr.city,
        district: addr.district,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
      };
    } else if (body.address) {
      shippingAddress = body.address;
    } else {
      throw new ApiError("ADDRESS_REQUIRED", "A shipping address is required", 422);
    }

    // Cart identity must be the user's (checkout requires auth).
    const identity = await resolveCartIdentity();
    const result = await initiateCheckout({ userId: user.id, guestToken: identity.guestToken }, user.id, shippingAddress);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
