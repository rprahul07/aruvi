import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Liveness + readiness in one endpoint. Returns 200 only when the database
 * is reachable. Never leaks secrets or internal error detail.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("store_settings").select("key").limit(1);
    checks.database = error ? "error" : "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return new Response(
    JSON.stringify({ status: healthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() }),
    {
      status: healthy ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    },
  );
}
