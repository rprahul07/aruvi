import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function AccountProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, phone")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">My Profile</h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>
      <div className="mt-6">
        <ProfileForm initialName={profile?.full_name ?? ""} initialPhone={profile?.phone ?? ""} />
      </div>
    </div>
  );
}
