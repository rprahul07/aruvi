import Link from "next/link";
import { listAdminOrders } from "@/lib/data/admin-orders";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusVariant,
} from "@/lib/constants/order-status";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

export const metadata = { title: "Orders · Admin" };

const STATUS_FILTERS = ["", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { orders, total } = await listAdminOrders({ status: status || undefined });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Orders</h1>
        <span className="text-sm text-muted">{total} total</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter || "all"}
            href={filter ? `/admin/orders?status=${filter}` : "/admin/orders"}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              (status ?? "") === filter ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
            }`}
          >
            {filter ? ORDER_STATUS_LABELS[filter as OrderStatus] : "All"}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink/[0.03] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-ink/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-ink hover:underline">
                    {order.orderNumber}
                  </Link>
                  <p className="text-xs text-muted">{order.itemCount} item(s)</p>
                </td>
                <td className="px-4 py-3 text-muted">{order.customerEmail ?? "—"}</td>
                <td className="px-4 py-3 text-muted">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </td>
                <td className="px-4 py-3">{formatMoney(order.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={order.paymentStatus === "captured" ? "success" : "neutral"}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={orderStatusVariant(order.status as OrderStatus)}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
