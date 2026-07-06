import { requireUser } from "@/lib/auth/authorize";
import { addressSchema } from "@/lib/validators/account";
import { createAddress, listAddresses } from "@/lib/data/addresses";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const user = await requireUser();
    const addresses = await listAddresses(user.id);
    return apiSuccess(addresses);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = addressSchema.parse(await request.json());
    const address = await createAddress(user.id, body);
    return apiSuccess(address, undefined, 201);
  } catch (error) {
    return apiError(error);
  }
}
