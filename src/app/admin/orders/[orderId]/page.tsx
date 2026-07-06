import { notFound } from "next/navigation";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextStatuses } from "@/lib/data/admin-orders";
import { Badge } from "@/components/ui/badge";
import { OrderStatusUpdater } from "@/components/admin/order-status-updater";
import { formatMoney } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusVariant,
} from "@/lib/constants/order-status";
import type { OrderStatus, PaymentStatus } from "@/types/domain";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, status, payment_status, subtotal_amount, discount_amount, tax_amount,
       shipping_amount, total_amount, coupon_code, created_at, user_id,
       order_items ( id, product_name, variant_label, sku, image_url, unit_price, quantity, line_total ),
       order_addresses ( address_type, full_name, phone, line1, line2, city, state, postal_code ),
       order_status_history ( status, note, created_at )`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const items = order.order_items as {
    id: string;
    product_name: string;
    variant_label: string | null;
    sku: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
  const shipping = (order.order_addresses as { address_type: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; postal_code: string }[]).find(
    (a) => a.address_type === "shipping",
  );
  const history = (order.order_status_history as { status: string; note: string | null; created_at: string }[]).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-ink">{order.order_number}</h1>
          <p className="text-xs text-muted">
            {new Date(order.created_at).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={order.payment_status === "captured" ? "success" : "neutral"}>
            {PAYMENT_STATUS_LABELS[order.payment_status as PaymentStatus]}
          </Badge>
          <Badge variant={orderStatusVariant(order.status as OrderStatus)}>
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 border-b border-line pb-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-ink/5">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.product_name} fill sizes="48px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-1 justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.product_name}</p>
                    <p className="text-xs text-muted">
                      {item.variant_label ? `${item.variant_label} · ` : ""}
                      {item.sku} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm text-ink">{formatMoney(item.line_total)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg border border-line p-4">
            <h2 className="font-display text-lg text-ink">Status Timeline</h2>
            <ol className="mt-3 space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-muted">{new Date(h.created_at).toLocaleString("en-IN")}</span>
                  <span className="font-medium text-ink">{ORDER_STATUS_LABELS[h.status as OrderStatus] ?? h.status}</span>
                  {h.note ? <span className="text-muted">— {h.note}</span> : null}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line p-4">
            <h2 className="font-display text-lg text-ink">Update Status</h2>
            <div className="mt-3">
              <OrderStatusUpdater orderId={order.id} nextOptions={nextStatuses(order.status)} />
            </div>
          </div>

          <div className="rounded-lg border border-line p-4">
            <h2 className="font-display text-lg text-ink">Shipping</h2>
            {shipping ? (
              <p className="mt-2 text-sm text-ink/80">
                {shipping.full_name}
                <br />
                {shipping.line1}
                {shipping.line2 ? `, ${shipping.line2}` : ""}
                <br />
                {shipping.city}, {shipping.state} {shipping.postal_code}
                <br />
                {shipping.phone}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">No address on file</p>
            )}
          </div>

          <div className="rounded-lg border border-line p-4 text-sm">
            <h2 className="font-display text-lg text-ink">Totals</h2>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatMoney(Number(order.subtotal_amount))}</span>
              </div>
              {Number(order.discount_amount) > 0 ? (
                <div className="flex justify-between text-accent">
                  <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
                  <span>-{formatMoney(Number(order.discount_amount))}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-muted">
                <span>Tax</span>
                <span>{formatMoney(Number(order.tax_amount))}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span>{Number(order.shipping_amount) === 0 ? "Free" : formatMoney(Number(order.shipping_amount))}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-medium text-ink">
                <span>Total</span>
                <span>{formatMoney(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
