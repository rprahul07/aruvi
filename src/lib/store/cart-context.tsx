"use client";

import * as React from "react";
import type { CartView } from "@/types/domain";
import { useAuth } from "@/lib/store/auth-context";

const EMPTY_CART: CartView = {
  id: "",
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  currency: "INR",
  couponCode: null,
  itemCount: 0,
};

interface CartContextValue {
  cart: CartView;
  isLoading: boolean;
  isMutating: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<{ ok: boolean; message?: string }>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [cart, setCart] = React.useState<CartView>(EMPTY_CART);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMutating, setIsMutating] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const hasMergedForUser = React.useRef<string | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await fetch("/api/v1/cart");
    if (res.ok) {
      const json = await res.json();
      setCart(json.data);
    }
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    if (authLoading) return;

    if (user && hasMergedForUser.current !== user.id) {
      hasMergedForUser.current = user.id;
      fetch("/api/v1/cart/merge", { method: "POST" })
        .catch(() => undefined)
        .finally(refresh);
    } else {
      refresh();
    }
  }, [user, authLoading, refresh]);

  const mutate = React.useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      setIsMutating(true);
      try {
        const res = await fetch(input, init);
        const json = await res.json();
        if (json.data) setCart(json.data);
        return json;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  const addItem = React.useCallback<CartContextValue["addItem"]>(
    async (variantId, quantity = 1) => {
      const json = await mutate("/api/v1/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity }),
      });
      if (json.success) setIsDrawerOpen(true);
      return { ok: json.success, message: json.error?.message };
    },
    [mutate],
  );

  const updateQuantity = React.useCallback<CartContextValue["updateQuantity"]>(
    async (itemId, quantity) => {
      await mutate(`/api/v1/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
    },
    [mutate],
  );

  const removeItem = React.useCallback<CartContextValue["removeItem"]>(
    async (itemId) => {
      await mutate(`/api/v1/cart/items/${itemId}`, { method: "DELETE" });
    },
    [mutate],
  );

  const applyCoupon = React.useCallback<CartContextValue["applyCoupon"]>(
    async (code) => {
      const json = await mutate("/api/v1/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      return { ok: json.success, message: json.error?.message };
    },
    [mutate],
  );

  const removeCoupon = React.useCallback<CartContextValue["removeCoupon"]>(async () => {
    await mutate("/api/v1/cart/coupon", { method: "DELETE" });
  }, [mutate]);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      isLoading,
      isMutating,
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      refresh,
    }),
    [cart, isLoading, isMutating, isDrawerOpen, addItem, updateQuantity, removeItem, applyCoupon, removeCoupon, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
