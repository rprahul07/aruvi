"use client";

import * as React from "react";
import Image from "next/image";
import type { ProductImage } from "@/types/domain";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = images[activeIndex] ?? images[0];

  if (!active) {
    return <div className="aspect-square w-full rounded-lg bg-ink/5" />;
  }

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-ink/5">
        <Image
          src={active.url}
          alt={active.altText ?? productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2",
                i === activeIndex ? "border-gold-deep" : "border-transparent",
              )}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
