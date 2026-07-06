import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sweeps expired checkout reservations and releases their held stock.
 * Intended to be hit by a scheduler (Vercel Cron, external cron, or
 * Supabase pg_cron calling the SQL function directly). Protected by a
 * shared secret in the Authorization header so it can't be triggered
 * anonymously.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "CRON_SECRET not configured" }), { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("release_expired_order_reservations");

  if (error) {
    console.error("Reservation sweep failed", error);
    return new Response(JSON.stringify({ error: "Sweep failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ released: data ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
