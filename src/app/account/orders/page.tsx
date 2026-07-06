import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { listUserOrders } from "@/lib/data/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { ORDER_STATUS_LABELS, orderStatusVariant } from "@/lib/constants/order-status";
import { Package } from "lucide-react";

export const metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orders = await listUserOrders(user!.id);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">My Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it will appear here."
            ctaLabel="Start shopping"
            ctaHref="/"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="block rounded-lg border border-line p-4 transition-colors hover:border-ink/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{order.orderNumber}</p>
                    <p className="text-xs text-muted">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABELS[order.status]}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  {order.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="relative h-14 w-11 overflow-hidden rounded bg-ink/5">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.productName} fill sizes="44px" className="object-cover" />
                      ) : null}
                    </div>
                  ))}
                  {order.items.length > 4 ? (
                    <span className="text-xs text-muted">+{order.items.length - 4} more</span>
                  ) : null}
                  <span className="ml-auto font-medium text-ink">{formatMoney(order.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
