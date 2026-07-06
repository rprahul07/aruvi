"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/store/cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { cart, isLoading, isMutating, updateQuantity, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = React.useState("");
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    const result = await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);
    if (!result.ok) setCouponError(result.message ?? "Couldn't apply this code");
    else setCouponInput("");
  }

  if (isLoading) {
    return <div className="container-page py-16 text-center text-sm text-muted">Loading your bag…</div>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Discover pieces made to be kept."
          ctaLabel="Continue shopping"
          ctaHref="/"
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-ink">Your Bag</h1>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        <ul className="space-y-6">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 border-b border-line pb-6">
              <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md bg-ink/5">
                {item.image ? (
                  <Image src={item.image} alt={item.productName} fill sizes="96px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/products/${item.productSlug}`} className="font-display text-lg text-ink">
                      {item.productName}
                    </Link>
                    <p className="text-sm text-muted">{item.variantLabel}</p>
                  </div>
                  <button type="button" aria-label="Remove item" onClick={() => removeItem(item.id)} className="text-muted hover:text-danger">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3 rounded-full border border-line">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={isMutating}
                      className="flex h-10 w-10 items-center justify-center"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-4 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={isMutating || item.quantity >= item.availableQuantity}
                      className="flex h-10 w-10 items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="font-medium text-ink">{formatMoney(item.lineTotal)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="h-fit rounded-lg border border-line p-6">
          <h2 className="font-display text-lg text-ink">Order Summary</h2>

          <form onSubmit={handleApplyCoupon} className="mt-4 flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" isLoading={isApplyingCoupon}>
              Apply
            </Button>
          </form>
          {couponError ? <p className="mt-2 text-xs text-danger">{couponError}</p> : null}
          {cart.couponCode ? (
            <div className="mt-2 flex items-center justify-between text-xs text-accent">
              <span>Applied: {cart.couponCode}</span>
              <button type="button" onClick={() => removeCoupon()} className="underline">
                Remove
              </button>
            </div>
          ) : null}

          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 ? (
              <div className="flex justify-between text-accent">
                <span>Discount</span>
                <span>-{formatMoney(cart.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-muted">
              <span>Tax</span>
              <span>{formatMoney(cart.tax)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span>{cart.shipping === 0 ? "Free" : formatMoney(cart.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(cart.total)}</span>
            </div>
          </div>

          <Link href="/checkout">
            <Button variant="gold" size="lg" className="mt-5 w-full">
              Proceed to Checkout
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
