-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
--
-- Design: privileged mutations (cart pricing, checkout, payments, admin
-- writes) go through Next.js API routes using the Supabase service-role
-- key, which bypasses RLS entirely — authorization for those paths is
-- enforced in application code (see src/lib/auth/authorize.ts), not here.
-- RLS below is defense-in-depth for any direct anon/authenticated access
-- (server components reading public catalogue data or a user's own rows)
-- and the last line of defense should app code ever regress.
-- ════════════════════════════════════════════════════════════════════════

-- ---- helper: is a product visible to the public? -------------------------
create or replace function app.product_is_public(p_product_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.products p
    where p.id = p_product_id and p.status = 'active'
  );
$$;

-- ---- catalogue: public read, admin-managed writes -------------------------

alter table public.categories enable row level security;
create policy categories_public_read on public.categories for select
  to anon, authenticated using (is_active = true or public.has_permission('product:read'));
create policy categories_admin_write on public.categories for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.collections enable row level security;
create policy collections_public_read on public.collections for select
  to anon, authenticated using (is_active = true or public.has_permission('product:read'));
create policy collections_admin_write on public.collections for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.tags enable row level security;
create policy tags_public_read on public.tags for select to anon, authenticated using (true);
create policy tags_admin_write on public.tags for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.attributes enable row level security;
create policy attributes_public_read on public.attributes for select to anon, authenticated using (true);
create policy attributes_admin_write on public.attributes for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.attribute_values enable row level security;
create policy attribute_values_public_read on public.attribute_values for select to anon, authenticated using (true);
create policy attribute_values_admin_write on public.attribute_values for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.products enable row level security;
create policy products_public_read on public.products for select
  to anon, authenticated using (status = 'active' or public.has_permission('product:read'));
create policy products_admin_write on public.products for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_collections enable row level security;
create policy product_collections_public_read on public.product_collections for select
  to anon, authenticated using (app.product_is_public(product_id) or public.has_permission('product:read'));
create policy product_collections_admin_write on public.product_collections for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_tags enable row level security;
create policy product_tags_public_read on public.product_tags for select
  to anon, authenticated using (app.product_is_public(product_id) or public.has_permission('product:read'));
create policy product_tags_admin_write on public.product_tags for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_relations enable row level security;
create policy product_relations_public_read on public.product_relations for select
  to anon, authenticated using (app.product_is_public(product_id) or public.has_permission('product:read'));
create policy product_relations_admin_write on public.product_relations for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_variants enable row level security;
create policy variants_public_read on public.product_variants for select
  to anon, authenticated using (
    (is_active = true and app.product_is_public(product_id)) or public.has_permission('product:read')
  );
create policy variants_admin_write on public.product_variants for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.variant_attribute_values enable row level security;
create policy variant_attrs_public_read on public.variant_attribute_values for select
  to anon, authenticated using (true);
create policy variant_attrs_admin_write on public.variant_attribute_values for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_images enable row level security;
create policy product_images_public_read on public.product_images for select
  to anon, authenticated using (app.product_is_public(product_id) or public.has_permission('product:read'));
create policy product_images_admin_write on public.product_images for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.product_videos enable row level security;
create policy product_videos_public_read on public.product_videos for select
  to anon, authenticated using (app.product_is_public(product_id) or public.has_permission('product:read'));
create policy product_videos_admin_write on public.product_videos for all
  to authenticated using (public.has_permission('product:manage')) with check (public.has_permission('product:manage'));

alter table public.inventory_movements enable row level security;
create policy inventory_movements_admin_read on public.inventory_movements for select
  to authenticated using (public.has_permission('inventory:read'));
create policy inventory_movements_admin_write on public.inventory_movements for insert
  to authenticated with check (public.has_permission('inventory:adjust'));

-- ---- identity ---------------------------------------------------------

alter table public.user_profiles enable row level security;
create policy user_profiles_self on public.user_profiles for select
  to authenticated using (auth.uid() = id or public.has_permission('customer:read'));
create policy user_profiles_self_update on public.user_profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

alter table public.addresses enable row level security;
create policy addresses_owner on public.addresses for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.roles enable row level security;
create policy roles_admin_read on public.roles for select to authenticated using (public.has_permission('admin:manage'));
alter table public.permissions enable row level security;
create policy permissions_admin_read on public.permissions for select to authenticated using (public.has_permission('admin:manage'));
alter table public.role_permissions enable row level security;
create policy role_permissions_admin_read on public.role_permissions for select to authenticated using (public.has_permission('admin:manage'));
alter table public.user_roles enable row level security;
create policy user_roles_admin_read on public.user_roles for select
  to authenticated using (auth.uid() = user_id or public.has_permission('admin:manage'));
create policy user_roles_admin_write on public.user_roles for all
  to authenticated using (public.has_permission('admin:manage')) with check (public.has_permission('admin:manage'));

-- ---- wishlist -----------------------------------------------------------

alter table public.wishlists enable row level security;
create policy wishlists_owner on public.wishlists for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.wishlist_items enable row level security;
create policy wishlist_items_owner on public.wishlist_items for all
  to authenticated using (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid())
  );

-- ---- cart (authenticated read only; all writes go through API routes) ---

alter table public.carts enable row level security;
create policy carts_owner_read on public.carts for select
  to authenticated using (auth.uid() = user_id);

alter table public.cart_items enable row level security;
create policy cart_items_owner_read on public.cart_items for select
  to authenticated using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ---- coupons / promotions (admin-managed; validity checked server-side) --

alter table public.coupons enable row level security;
create policy coupons_admin_all on public.coupons for all
  to authenticated using (public.has_permission('coupon:manage')) with check (public.has_permission('coupon:manage'));

alter table public.coupon_rules enable row level security;
create policy coupon_rules_admin_all on public.coupon_rules for all
  to authenticated using (public.has_permission('coupon:manage')) with check (public.has_permission('coupon:manage'));

alter table public.coupon_redemptions enable row level security;
create policy coupon_redemptions_admin_read on public.coupon_redemptions for select
  to authenticated using (auth.uid() = user_id or public.has_permission('coupon:manage'));

alter table public.promotions enable row level security;
create policy promotions_public_read on public.promotions for select to anon, authenticated using (is_active = true);
create policy promotions_admin_write on public.promotions for all
  to authenticated using (public.has_permission('coupon:manage')) with check (public.has_permission('coupon:manage'));

-- ---- orders & payments (read own; writes are service-role only) ---------

alter table public.orders enable row level security;
create policy orders_owner_read on public.orders for select
  to authenticated using (auth.uid() = user_id or public.has_permission('order:read'));

alter table public.order_items enable row level security;
create policy order_items_owner_read on public.order_items for select
  to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('order:read')))
  );

alter table public.order_addresses enable row level security;
create policy order_addresses_owner_read on public.order_addresses for select
  to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('order:read')))
  );

alter table public.order_status_history enable row level security;
create policy order_status_history_owner_read on public.order_status_history for select
  to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('order:read')))
  );

alter table public.payments enable row level security;
create policy payments_admin_read on public.payments for select to authenticated using (public.has_permission('order:read'));

alter table public.payment_events enable row level security;
create policy payment_events_admin_read on public.payment_events for select to authenticated using (public.has_permission('order:read'));

alter table public.refunds enable row level security;
create policy refunds_admin_read on public.refunds for select to authenticated using (public.has_permission('refund:create'));

alter table public.shipments enable row level security;
create policy shipments_owner_read on public.shipments for select
  to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_permission('order:read')))
  );

-- ---- reviews -------------------------------------------------------------

alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews for select
  to anon, authenticated using (moderation_status = 'approved' or auth.uid() = user_id or public.has_permission('review:moderate'));
create policy reviews_owner_insert on public.reviews for insert
  to authenticated with check (auth.uid() = user_id);
create policy reviews_owner_update on public.reviews for update
  to authenticated using (auth.uid() = user_id or public.has_permission('review:moderate'))
  with check (auth.uid() = user_id or public.has_permission('review:moderate'));
create policy reviews_owner_delete on public.reviews for delete
  to authenticated using (auth.uid() = user_id or public.has_permission('review:moderate'));

alter table public.review_images enable row level security;
create policy review_images_public_read on public.review_images for select
  to anon, authenticated using (
    exists (select 1 from public.reviews r where r.id = review_id and (r.moderation_status = 'approved' or r.user_id = auth.uid()))
  );
create policy review_images_owner_write on public.review_images for all
  to authenticated using (
    exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- ---- engagement & analytics ------------------------------------------

alter table public.notifications enable row level security;
create policy notifications_owner on public.notifications for select
  to authenticated using (auth.uid() = user_id);
create policy notifications_owner_update on public.notifications for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.recently_viewed enable row level security;
create policy recently_viewed_owner on public.recently_viewed for all
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.search_events enable row level security;
create policy search_events_insert on public.search_events for insert
  to anon, authenticated with check (user_id is null or auth.uid() = user_id);
create policy search_events_admin_read on public.search_events for select
  to authenticated using (public.has_permission('analytics:read'));

alter table public.analytics_events enable row level security;
create policy analytics_events_insert on public.analytics_events for insert
  to anon, authenticated with check (user_id is null or auth.uid() = user_id);
create policy analytics_events_admin_read on public.analytics_events for select
  to authenticated using (public.has_permission('analytics:read'));

alter table public.newsletter_subscriptions enable row level security;
create policy newsletter_insert on public.newsletter_subscriptions for insert to anon, authenticated with check (true);
create policy newsletter_admin_read on public.newsletter_subscriptions for select
  to authenticated using (public.has_permission('analytics:read'));

-- ---- merchandising ------------------------------------------------------

alter table public.homepage_sections enable row level security;
create policy homepage_sections_public_read on public.homepage_sections for select
  to anon, authenticated using (is_enabled = true or public.has_permission('marketing:manage'));
create policy homepage_sections_admin_write on public.homepage_sections for all
  to authenticated using (public.has_permission('marketing:manage')) with check (public.has_permission('marketing:manage'));

alter table public.banners enable row level security;
create policy banners_public_read on public.banners for select
  to anon, authenticated using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.has_permission('marketing:manage')
  );
create policy banners_admin_write on public.banners for all
  to authenticated using (public.has_permission('marketing:manage')) with check (public.has_permission('marketing:manage'));

-- ---- audit ---------------------------------------------------------------

alter table public.audit_logs enable row level security;
create policy audit_logs_admin_read on public.audit_logs for select
  to authenticated using (public.has_permission('admin:manage'));
