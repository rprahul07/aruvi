"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/lib/store/cart-context";
import { formatMoney } from "@/lib/utils";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, isMutating, updateQuantity, removeItem } = useCart();

  return (
    <Sheet open={open} onClose={onClose} side="right" title={`Your Bag (${cart.itemCount})`}>
      {cart.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Discover pieces made to be kept."
          ctaLabel="Continue shopping"
          ctaHref="/"
        />
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 space-y-4 overflow-y-auto">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-ink/5">
                  {item.image ? (
                    <Image src={item.image} alt={item.productName} fill sizes="64px" className="object-cover" />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="text-sm font-medium text-ink" onClick={onClose}>
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted">{item.variantLabel}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => removeItem(item.id)}
                      disabled={isMutating}
                      className="text-muted hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-line">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isMutating}
                        className="flex h-8 w-8 items-center justify-center"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-4 text-center text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isMutating || item.quantity >= item.availableQuantity}
                        className="flex h-8 w-8 items-center justify-center"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-medium text-ink">{formatMoney(item.lineTotal)}</span>
                  </div>
                  {item.quantity >= item.availableQuantity ? (
                    <p className="mt-1 text-xs text-warning">Only {item.availableQuantity} left in stock</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-line pt-4">
            <div className="flex justify-between text-sm text-muted">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 ? (
              <div className="mt-1 flex justify-between text-sm text-accent">
                <span>Discount {cart.couponCode ? `(${cart.couponCode})` : ""}</span>
                <span>-{formatMoney(cart.discount)}</span>
              </div>
            ) : null}
            <div className="mt-1 flex justify-between text-base font-medium text-ink">
              <span>Total</span>
              <span>{formatMoney(cart.total)}</span>
            </div>
            <Link href="/checkout" onClick={onClose}>
              <Button variant="gold" size="lg" className="mt-4 w-full">
                Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Sheet>
  );
}
