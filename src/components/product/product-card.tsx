import Image from "next/image";
import Link from "next/link";
import type { ProductSummary } from "@/types/domain";
import { PriceTag } from "@/components/ui/price-tag";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/product/wishlist-button";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <div className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden rounded-lg bg-surface"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5">
          {product.coverImage ? (
            <Image
              src={product.coverImage.url}
              alt={product.coverImage.altText ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-brand)] group-hover:scale-105"
            />
          ) : null}
          {!product.inStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
              <Badge variant="neutral" className="bg-surface/90">
                Out of stock
              </Badge>
            </div>
          ) : null}
        </div>
        <div className="pt-3">
          {product.category ? (
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted">
              {product.category.name}
            </p>
          ) : null}
          <h3 className="mt-1 truncate font-display text-base text-ink">{product.name}</h3>
          <PriceTag price={product.basePrice} salePrice={product.salePrice} size="sm" className="mt-1" />
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <WishlistButton productId={product.id} />
      </div>
    </div>
  );
}
