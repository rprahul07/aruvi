import "server-only";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Re-checks permission against the database — this is the real
 * authorization boundary for admin API routes and Server Actions.
 * Hiding a frontend button is not authorization; this is.
 *
 * Uses the request-scoped (RLS-respecting) client so `has_permission()`
 * evaluates against `auth.uid()` for the actual signed-in user, even
 * though the route handler itself will typically go on to use the
 * service-role client for the privileged write.
 */
export async function requirePermission(permission: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const { data, error } = await supabase.rpc("has_permission", {
    perm: permission,
  });

  if (error) {
    throw new ForbiddenError(`Permission check failed: ${error.message}`);
  }

  if (!data) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return user;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}
