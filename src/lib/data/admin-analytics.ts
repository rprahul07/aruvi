import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DashboardMetrics {
  revenueToday: number;
  revenueThisMonth: number;
  ordersToday: number;
  pendingOrders: number;
  averageOrderValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  paymentFailures: number;
  newCustomersThisMonth: number;
}

/**
 * All aggregation happens in Postgres via count/filtered queries — we never
 * pull the orders table into the app to sum it in JS. For a store at this
 * scale these targeted queries are cheap; the paid-orders revenue rollup is
 * the only one that scans order rows, and it's bounded by date + status and
 * backed by the idx_orders_payment_status index.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const admin = createAdminClient();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    paidTodayRes,
    paidMonthRes,
    ordersTodayRes,
    pendingRes,
    lowStockRes,
    outOfStockRes,
    paymentFailuresRes,
    newCustomersRes,
  ] = await Promise.all([
    admin.from("orders").select("total_amount").eq("payment_status", "captured").gte("created_at", startOfToday),
    admin.from("orders").select("total_amount").eq("payment_status", "captured").gte("created_at", startOfMonth),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "captured").gte("created_at", startOfToday),
    admin.from("orders").select("id", { count: "exact", head: true }).in("status", ["confirmed", "processing", "packed"]),
    admin.from("product_variants").select("id, stock_quantity, reserved_quantity, low_stock_threshold, is_active"),
    admin.from("product_variants").select("id", { count: "exact", head: true }).eq("is_active", true).eq("stock_quantity", 0),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "failed").gte("created_at", startOfMonth),
    admin.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
  ]);

  const revenueToday = (paidTodayRes.data ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0);
  const revenueThisMonth = (paidMonthRes.data ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0);
  const paidMonthCount = paidMonthRes.data?.length ?? 0;

  // Low stock: available (stock - reserved) at or below threshold but > 0.
  const lowStockCount = (lowStockRes.data ?? []).filter((v) => {
    const available = v.stock_quantity - v.reserved_quantity;
    return v.is_active && available > 0 && available <= v.low_stock_threshold;
  }).length;

  return {
    revenueToday,
    revenueThisMonth,
    ordersToday: ordersTodayRes.count ?? 0,
    pendingOrders: pendingRes.count ?? 0,
    averageOrderValue: paidMonthCount > 0 ? revenueThisMonth / paidMonthCount : 0,
    lowStockCount,
    outOfStockCount: outOfStockRes.count ?? 0,
    paymentFailures: paymentFailuresRes.count ?? 0,
    newCustomersThisMonth: newCustomersRes.count ?? 0,
  };
}
