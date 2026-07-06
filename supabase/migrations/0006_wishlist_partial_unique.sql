-- ════════════════════════════════════════════════════════════════════════
-- wishlist_items.unique(wishlist_id, product_id, variant_id) never fires
-- for product-level (variant_id IS NULL) wishlist entries, since NULL is
-- never equal to NULL in a unique constraint. Add a partial unique index
-- covering the NULL case so upsert-based dedup actually works.
-- ════════════════════════════════════════════════════════════════════════

create unique index idx_wishlist_items_product_no_variant
  on public.wishlist_items (wishlist_id, product_id)
  where variant_id is null;
