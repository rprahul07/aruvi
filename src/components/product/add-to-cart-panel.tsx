"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import type { ProductDetail, ProductVariant } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/ui/price-tag";
import { WishlistButton } from "@/components/product/wishlist-button";
import { useCart } from "@/lib/store/cart-context";
import { useRouter } from "next/navigation";

function groupAttributes(variants: ProductVariant[]) {
  const map = new Map<string, { name: string; values: Map<string, string> }>();
  for (const variant of variants) {
    for (const av of variant.attributeValues) {
      if (!map.has(av.attributeId)) map.set(av.attributeId, { name: av.attributeName, values: new Map() });
      map.get(av.attributeId)!.values.set(av.slug, av.value);
    }
  }
  return [...map.entries()].map(([attributeId, { name, values }]) => ({
    attributeId,
    name,
    values: [...values.entries()].map(([slug, value]) => ({ slug, value })),
  }));
}

function findMatchingVariant(variants: ProductVariant[], selection: Record<string, string>) {
  return variants.find((v) =>
    v.attributeValues.every((av) => selection[av.attributeId] === av.slug) &&
    Object.keys(selection).length === v.attributeValues.length,
  );
}

export function AddToCartPanel({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { addItem, isMutating, openDrawer } = useCart();
  const attributeGroups = React.useMemo(() => groupAttributes(product.variants), [product.variants]);

  const [selection, setSelection] = React.useState<Record<string, string>>(() => {
    const first = product.variants.find((v) => v.isActive && v.availableQuantity > 0) ?? product.variants[0];
    const initial: Record<string, string> = {};
    first?.attributeValues.forEach((av) => {
      initial[av.attributeId] = av.slug;
    });
    return initial;
  });
  const [quantity, setQuantity] = React.useState(1);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const selectedVariant = findMatchingVariant(product.variants, selection);
  const isOutOfStock = !selectedVariant || selectedVariant.availableQuantity === 0;

  async function handleAddToCart(redirectToCheckout = false) {
    if (!selectedVariant) return;
    setFeedback(null);
    const result = await addItem(selectedVariant.id, quantity);
    if (!result.ok) {
      setFeedback(result.message ?? "Couldn't add this to your bag");
      return;
    }
    if (redirectToCheckout) {
      router.push("/checkout");
    } else {
      openDrawer();
    }
  }

  return (
    <div>
      <PriceTag
        price={selectedVariant?.price ?? product.basePrice}
        salePrice={selectedVariant?.salePrice ?? product.salePrice}
        size="lg"
      />

      {attributeGroups.map((group) => (
        <div key={group.attributeId} className="mt-5">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">{group.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.values.map((v) => {
              const isSelected = selection[group.attributeId] === v.slug;
              return (
                <button
                  key={v.slug}
                  type="button"
                  onClick={() => setSelection((prev) => ({ ...prev, [group.attributeId]: v.slug }))}
                  className={`min-h-11 rounded-md border px-4 text-sm transition-colors ${
                    isSelected ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {v.value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted">Quantity</p>
        <div className="mt-2 flex w-fit items-center gap-3 rounded-md border border-line">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(selectedVariant?.availableQuantity ?? 1, q + 1))}
            disabled={!selectedVariant || quantity >= selectedVariant.availableQuantity}
            className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isOutOfStock ? (
        <p className="mt-4 text-sm text-danger">This combination is currently out of stock.</p>
      ) : selectedVariant && selectedVariant.availableQuantity <= selectedVariant.lowStockThreshold ? (
        <p className="mt-4 text-sm text-warning">Only {selectedVariant.availableQuantity} left in stock.</p>
      ) : null}
      {feedback ? <p className="mt-3 text-sm text-danger">{feedback}</p> : null}

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={isOutOfStock || isMutating}
          isLoading={isMutating}
          onClick={() => handleAddToCart(false)}
        >
          Add to Cart
        </Button>
        <Button
          variant="gold"
          size="lg"
          className="flex-1"
          disabled={isOutOfStock || isMutating}
          onClick={() => handleAddToCart(true)}
        >
          Buy Now
        </Button>
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
