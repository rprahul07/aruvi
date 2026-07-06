"use client";

import * as React from "react";
import { useAuth } from "@/lib/store/auth-context";

const GUEST_WISHLIST_KEY = "aurvi.guest_wishlist";

function readGuestWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeGuestWishlist(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
}

interface WishlistContextValue {
  productIds: Set<string>;
  isPending: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
}

const WishlistContext = React.createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [productIds, setProductIds] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const hasMerged = React.useRef(false);

  const loadServerWishlist = React.useCallback(async () => {
    const res = await fetch("/api/v1/wishlist");
    if (!res.ok) return;
    const json = await res.json();
    setProductIds(new Set<string>(json.data.productIds));
  }, []);

  React.useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Sync in-memory wishlist from localStorage (external system) on sign-out.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductIds(new Set(readGuestWishlist()));
      hasMerged.current = false;
      return;
    }

    // Just signed in: merge any guest-collected wishlist items into the
    // server-side wishlist once, then clear local storage.
    const guestIds = readGuestWishlist();
    if (!hasMerged.current && guestIds.length > 0) {
      hasMerged.current = true;
      fetch("/api/v1/wishlist/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: guestIds }),
      })
        .then(() => {
          writeGuestWishlist([]);
          return loadServerWishlist();
        })
        .catch(() => loadServerWishlist());
    } else {
      hasMerged.current = true;
      loadServerWishlist();
    }
  }, [user, authLoading, loadServerWishlist]);

  const toggle = React.useCallback(
    async (productId: string) => {
      setPending((prev) => new Set(prev).add(productId));
      const isSaved = productIds.has(productId);

      try {
        if (!user) {
          const next = new Set(productIds);
          isSaved ? next.delete(productId) : next.add(productId);
          setProductIds(next);
          writeGuestWishlist([...next]);
          return;
        }

        if (isSaved) {
          await fetch(`/api/v1/wishlist/${productId}`, { method: "DELETE" });
        } else {
          await fetch("/api/v1/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
        }
        await loadServerWishlist();
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [productIds, user, loadServerWishlist],
  );

  const value = React.useMemo(
    () => ({
      productIds,
      isPending: (id: string) => pending.has(id),
      toggle,
    }),
    [productIds, pending, toggle],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
