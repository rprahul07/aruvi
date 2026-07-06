"use client";

import { AuthProvider } from "@/lib/store/auth-context";
import { WishlistProvider } from "@/lib/store/wishlist-context";
import { CartProvider } from "@/lib/store/cart-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>{children}</CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
