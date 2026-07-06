import { requireUser } from "@/lib/auth/authorize";
import { addressSchema } from "@/lib/validators/account";
import { deleteAddress, updateAddress } from "@/lib/data/addresses";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ addressId: string }> }) {
  try {
    const user = await requireUser();
    const { addressId } = await params;
    const body = addressSchema.parse(await request.json());
    const address = await updateAddress(user.id, addressId, body);
    return apiSuccess(address);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ addressId: string }> }) {
  try {
    const user = await requireUser();
    const { addressId } = await params;
    await deleteAddress(user.id, addressId);
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
