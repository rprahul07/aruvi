import { requireUser } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileSchema } from "@/lib/validators/account";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = profileSchema.parse(await request.json());

    const admin = createAdminClient();
    const { error } = await admin
      .from("user_profiles")
      .update({ full_name: body.fullName, phone: body.phone || null })
      .eq("id", user.id);

    if (error) throw error;
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
