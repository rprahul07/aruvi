import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOrCreateWishlistId(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await admin
    .from("wishlists")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: wishlist } = await admin.from("wishlists").select("id").eq("user_id", userId).maybeSingle();
  if (!wishlist) return [];

  const { data, error } = await admin
    .from("wishlist_items")
    .select("product_id")
    .eq("wishlist_id", wishlist.id);

  if (error) throw error;
  return data.map((row) => row.product_id);
}

export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const wishlistId = await getOrCreateWishlistId(userId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("wishlist_items")
    .upsert({ wishlist_id: wishlistId, product_id: productId }, { onConflict: "wishlist_id,product_id" });

  if (error) throw error;
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: wishlist } = await admin.from("wishlists").select("id").eq("user_id", userId).maybeSingle();
  if (!wishlist) return;

  await admin.from("wishlist_items").delete().eq("wishlist_id", wishlist.id).eq("product_id", productId);
}

export async function mergeGuestWishlist(userId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const wishlistId = await getOrCreateWishlistId(userId);
  const admin = createAdminClient();

  const rows = productIds.map((productId) => ({ wishlist_id: wishlistId, product_id: productId }));
  const { error } = await admin
    .from("wishlist_items")
    .upsert(rows, { onConflict: "wishlist_id,product_id" });

  if (error) throw error;
}
