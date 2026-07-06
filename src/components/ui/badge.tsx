import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.1em]",
  {
    variants: {
      variant: {
        gold: "bg-gold-light text-gold-deep",
        accent: "bg-accent-light text-accent",
        danger: "bg-danger-light text-danger",
        success: "bg-success-light text-success",
        warning: "bg-warning-light text-warning",
        neutral: "bg-ink/5 text-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
