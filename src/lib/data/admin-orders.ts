import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/types/domain";

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  customerEmail: string | null;
  createdAt: string;
  itemCount: number;
}

export async function listAdminOrders(opts: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ orders: AdminOrderListItem[]; total: number }> {
  const admin = createAdminClient();
  const { status, limit = 30, offset = 0 } = opts;

  let query = admin
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, created_at, user_id, order_items(id)", {
      count: "exact",
    })
    .neq("payment_status", "created")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw error;

  // Resolve customer emails from auth via the profiles table join is not
  // available; fetch emails in a second bounded query.
  const userIds = [...new Set((data ?? []).map((o) => o.user_id))];
  const emailMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of authData?.users ?? []) {
      if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? null);
    }
  }

  const orders: AdminOrderListItem[] = (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    paymentStatus: o.payment_status,
    total: Number(o.total_amount),
    customerEmail: emailMap.get(o.user_id) ?? null,
    createdAt: o.created_at,
    itemCount: (o.order_items as { id: string }[]).length,
  }));

  return { orders, total: count ?? 0 };
}

const ALLOWED_TRANSITIONS: Record<string, OrderStatus[]> = {
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned"],
  returned: ["refund_pending"],
  refund_pending: ["refunded"],
};

export function isValidTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to as OrderStatus) ?? false;
}

export function nextStatuses(from: string): OrderStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  actorId: string,
  note?: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Order not found");

  if (!isValidTransition(order.status, newStatus)) {
    throw new Error(`Cannot move an order from ${order.status} to ${newStatus}`);
  }

  await admin.from("orders").update({ status: newStatus }).eq("id", orderId);
  await admin.from("order_status_history").insert({
    order_id: orderId,
    status: newStatus,
    note: note ?? null,
    actor_id: actorId,
  });
}
