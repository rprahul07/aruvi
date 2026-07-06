import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEntry {
  actorId: string;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  requestId?: string | null;
  ipAddress?: string | null;
}

/** Records a sensitive admin action. Best-effort — never blocks the action it logs. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before_state: (entry.beforeState ?? null) as never,
      after_state: (entry.afterState ?? null) as never,
      request_id: entry.requestId ?? null,
      ip_address: entry.ipAddress ?? null,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
