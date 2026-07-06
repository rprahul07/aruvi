import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminContext {
  userId: string;
  email: string | null;
  roles: string[];
  permissions: Set<string>;
}

/**
 * Loads the current user's admin roles + permissions from the database.
 * Returns null if not authenticated or has no admin role at all.
 * This is the source of truth used by the admin layout and every admin
 * action — never a client-side role check.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("roles(code, role_permissions(permissions(code)))")
    .eq("user_id", user.id);

  if (!roleRows || roleRows.length === 0) return null;

  const roles: string[] = [];
  const permissions = new Set<string>();

  for (const row of roleRows) {
    const role = row.roles as unknown as {
      code: string;
      role_permissions: { permissions: { code: string } }[];
    } | null;
    if (!role) continue;
    roles.push(role.code);
    for (const rp of role.role_permissions) {
      permissions.add(rp.permissions.code);
    }
  }

  if (roles.length === 0) return null;

  return { userId: user.id, email: user.email ?? null, roles, permissions };
}

export function hasPermission(ctx: AdminContext | null, permission: string): boolean {
  return ctx?.permissions.has(permission) ?? false;
}
