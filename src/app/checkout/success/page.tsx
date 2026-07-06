import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserOrder } from "@/lib/data/orders";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Order Confirmed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const order = await getUserOrder(user.id, orderId);
  if (!order) redirect("/account/orders");

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" strokeWidth={1.25} />
        <h1 className="mt-4 font-display text-3xl text-ink">Thank you for your order</h1>
        <p className="mt-2 text-sm text-muted">
          Order <span className="font-medium text-ink">{order.orderNumber}</span> is confirmed. We&apos;ve sent the
          details to your email.
        </p>

        <div className="mt-8 rounded-lg border border-line p-6 text-left">
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-ink/80">
                  {item.productName} <span className="text-muted">× {item.quantity}</span>
                </span>
                <span className="text-ink">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3 text-base font-medium text-ink">
            <span>Total paid</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/account/orders" className={buttonVariants({ variant: "primary" })}>
            View my orders
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
