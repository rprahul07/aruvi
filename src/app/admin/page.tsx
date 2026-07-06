import { getDashboardMetrics } from "@/lib/data/admin-analytics";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };

function MetricCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-xs uppercase tracking-[0.1em] text-muted">{label}</p>
      <p
        className={`mt-2 font-display text-2xl ${
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Revenue Today" value={formatMoney(metrics.revenueToday)} />
        <MetricCard label="Revenue This Month" value={formatMoney(metrics.revenueThisMonth)} />
        <MetricCard label="Orders Today" value={String(metrics.ordersToday)} />
        <MetricCard label="Avg Order Value" value={formatMoney(metrics.averageOrderValue)} />
        <MetricCard label="Pending Orders" value={String(metrics.pendingOrders)} />
        <MetricCard label="New Customers (mo)" value={String(metrics.newCustomersThisMonth)} />
        <MetricCard
          label="Low Stock"
          value={String(metrics.lowStockCount)}
          tone={metrics.lowStockCount > 0 ? "warning" : undefined}
        />
        <MetricCard
          label="Out of Stock"
          value={String(metrics.outOfStockCount)}
          tone={metrics.outOfStockCount > 0 ? "danger" : undefined}
        />
      </div>

      {metrics.paymentFailures > 0 ? (
        <p className="mt-6 rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {metrics.paymentFailures} payment failure(s) this month — review in Orders.
        </p>
      ) : null}
    </div>
  );
}
