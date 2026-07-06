#!/usr/bin/env node
/**
 * Grants a role to a user by email. Use this to bootstrap the first admin.
 *
 *   node scripts/grant-admin.mjs someone@example.com SUPER_ADMIN
 *
 * Reads Supabase credentials from the environment (.env.local is loaded
 * automatically when run via `npm run grant-admin`). Requires the service
 * role key — never run this in an untrusted environment.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Minimal .env.local loader (no dependency on dotenv).
function loadEnv() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local optional if vars already in environment
  }
}

loadEnv();

const email = process.argv[2];
const roleCode = process.argv[3] ?? "SUPER_ADMIN";

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [ROLE_CODE]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find the user by email (paginate through auth users).
let userId = null;
let page = 1;
while (!userId) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) userId = found.id;
  if (data.users.length < 200) break;
  page += 1;
}

if (!userId) {
  console.error(`No user found with email ${email}. They must sign up first.`);
  process.exit(1);
}

const { data: role, error: roleError } = await supabase
  .from("roles")
  .select("id, code")
  .eq("code", roleCode)
  .maybeSingle();

if (roleError || !role) {
  console.error(`Role ${roleCode} not found. Valid roles: SUPER_ADMIN, ADMIN, PRODUCT_MANAGER, ORDER_MANAGER, SUPPORT_AGENT, MARKETING_MANAGER, ANALYST`);
  process.exit(1);
}

const { error: grantError } = await supabase
  .from("user_roles")
  .upsert({ user_id: userId, role_id: role.id }, { onConflict: "user_id,role_id" });

if (grantError) {
  console.error("Failed to grant role:", grantError.message);
  process.exit(1);
}

console.log(`✓ Granted ${role.code} to ${email} (${userId})`);
