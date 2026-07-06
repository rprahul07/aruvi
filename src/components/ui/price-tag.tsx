import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PriceTag({
  price,
  salePrice,
  size = "md",
  className,
}: {
  price: number;
  salePrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasDiscount = salePrice != null && salePrice < price;
  const discountPercent = hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0;

  const sizeClass = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }[size];

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-medium text-ink", sizeClass)}>
        {formatMoney(hasDiscount ? salePrice! : price)}
      </span>
      {hasDiscount ? (
        <>
          <span className="text-sm text-muted line-through">{formatMoney(price)}</span>
          <span className="text-xs font-medium text-accent">{discountPercent}% off</span>
        </>
      ) : null}
    </div>
  );
}
