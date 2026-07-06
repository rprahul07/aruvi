import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const GUEST_CART_COOKIE = "aurvi_guest_cart";

export interface CartIdentity {
  userId: string | null;
  guestToken: string | null;
}

/** Reads (never creates) the current identity — safe to call from GET handlers. */
export async function resolveCartIdentity(): Promise<CartIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { userId: user.id, guestToken: null };

  const cookieStore = await cookies();
  return { userId: null, guestToken: cookieStore.get(GUEST_CART_COOKIE)?.value ?? null };
}

/** Reads the identity, minting a guest token cookie if none exists yet — for mutating handlers. */
export async function resolveOrCreateCartIdentity(): Promise<CartIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { userId: user.id, guestToken: null };

  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!token) {
    token = randomUUID();
    cookieStore.set(GUEST_CART_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return { userId: null, guestToken: token };
}

export async function clearGuestCartCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_CART_COOKIE);
}
