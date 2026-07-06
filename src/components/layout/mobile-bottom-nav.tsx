"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, Heart, Home, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/store/cart-context";
import { useWishlist } from "@/lib/store/wishlist-context";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/categories", icon: Grid2x2 },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Account", href: "/account", icon: User },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cart } = useCart();
  const { productIds } = useWishlist();

  const badgeFor = (href: string) => {
    if (href === "/cart") return cart.itemCount;
    if (href === "/wishlist") return productIds.size;
    return 0;
  };

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-bottomnav flex border-t border-line bg-surface md:hidden"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const badge = badgeFor(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2"
            aria-current={isActive ? "page" : undefined}
          >
            <Icon
              className={cn("h-5 w-5", isActive ? "text-ink" : "text-muted")}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span className={cn("text-[0.65rem]", isActive ? "text-ink" : "text-muted")}>
              {tab.label}
            </span>
            {badge > 0 ? (
              <span className="absolute right-[22%] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[0.6rem] text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
