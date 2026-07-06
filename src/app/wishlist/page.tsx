"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSummary } from "@/types/domain";

export default function WishlistPage() {
  const { productIds } = useWishlist();
  const idsKey = [...productIds].sort().join(",");
  const [cache, setCache] = React.useState<{ key: string; products: ProductSummary[] } | null>(null);

  React.useEffect(() => {
    if (idsKey === "") return;
    let cancelled = false;
    fetch(`/api/v1/products?ids=${idsKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setCache({ key: idsKey, products: json.data ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // Derived during render — no synchronous setState in the effect.
  const products: ProductSummary[] | null =
    productIds.size === 0 ? [] : cache?.key === idsKey ? cache.products : null;

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl text-ink">Wishlist</h1>

      {products === null ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Save pieces you love to find them here later."
            ctaLabel="Discover jewellery"
            ctaHref="/"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
