import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icon ? <Icon className="h-10 w-10 text-muted" strokeWidth={1.25} aria-hidden="true" /> : null}
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
