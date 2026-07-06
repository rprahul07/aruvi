"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/store/wishlist-context";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId }: { productId: string }) {
  const { productIds, isPending, toggle } = useWishlist();
  const isSaved = productIds.has(productId);

  return (
    <button
      type="button"
      aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isSaved}
      disabled={isPending(productId)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle(productId);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow-sm transition-transform active:scale-90 disabled:opacity-60"
    >
      <Heart
        className={cn("h-[18px] w-[18px]", isSaved ? "fill-accent text-accent" : "text-ink")}
        strokeWidth={1.5}
      />
    </button>
  );
}
