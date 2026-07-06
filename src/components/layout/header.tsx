"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { BRAND } from "@/lib/constants/brand";
import { useCart } from "@/lib/store/cart-context";
import { useWishlist } from "@/lib/store/wishlist-context";
import { CartDrawer } from "@/components/cart/cart-drawer";

const NAV_LINKS = [
  { label: "Rings", href: "/category/rings" },
  { label: "Earrings", href: "/category/earrings" },
  { label: "Necklaces", href: "/category/necklaces" },
  { label: "Bangles", href: "/category/bangles" },
  { label: "New Arrivals", href: "/collections/new-arrivals" },
];

export function Header() {
  const { cart, isDrawerOpen, openDrawer, closeDrawer } = useCart();
  const { productIds } = useWishlist();

  return (
    <>
      <header className="sticky top-0 z-header border-b border-line bg-paper/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between md:h-20">
          <Link href="/" className="font-display text-2xl tracking-wide text-ink">
            {BRAND.name}
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium uppercase tracking-[0.1em] text-ink/80 transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
            >
              <Search className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            <Link
              href="/account"
              aria-label="Account"
              className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 md:flex"
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 md:flex"
            >
              <Heart className="h-5 w-5" strokeWidth={1.5} />
              {productIds.size > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[0.6rem] text-white">
                  {productIds.size}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={openDrawer}
              aria-label="Open cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {cart.itemCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[0.6rem] text-white">
                  {cart.itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>
      <CartDrawer open={isDrawerOpen} onClose={closeDrawer} />
    </>
  );
}
