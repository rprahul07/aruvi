import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserOrder } from "@/lib/data/orders";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusVariant,
} from "@/lib/constants/order-status";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const order = await getUserOrder(user!.id, orderId);
  if (!order) notFound();

  const addr = order.shippingAddress;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl text-ink">{order.orderNumber}</h1>
          <p className="text-xs text-muted">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
          <Badge variant={order.paymentStatus === "captured" ? "success" : "neutral"}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_300px]">
        <div>
          <ul className="space-y-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 border-b border-line pb-4">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-ink/5">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-1 justify-between">
                  <div>
                    <p className="font-medium text-ink">{item.productName}</p>
                    {item.variantLabel ? <p className="text-sm text-muted">{item.variantLabel}</p> : null}
                    <p className="text-sm text-muted">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium text-ink">{formatMoney(item.lineTotal)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <h2 className="font-display text-lg text-ink">Delivery Address</h2>
            <p className="mt-2 text-sm text-ink/80">
              {addr.fullName}
              <br />
              {addr.line1}
              {addr.line2 ? `, ${addr.line2}` : ""}
              <br />
              {addr.city}, {addr.state} {addr.postalCode}
              <br />
              {addr.phone}
            </p>
          </div>
        </div>

        <div className="h-fit rounded-lg border border-line p-5">
          <h2 className="font-display text-lg text-ink">Payment Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>
            {order.discount > 0 ? (
              <div className="flex justify-between text-accent">
                <span>Discount</span>
                <span>-{formatMoney(order.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-muted">
              <span>Tax</span>
              <span>{formatMoney(order.tax)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatMoney(order.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
