-- ═══════════════════════════════════════════════════════════════════════
-- AURVI — complete hosted-database setup (all migrations 0001–0008).
-- Paste this whole file into the Supabase SQL Editor and run it ONCE on a
-- fresh (empty) database. It creates all tables, so it is NOT re-runnable —
-- if it errors partway, run `drop schema public cascade; create schema public;`
-- then run this file again from clean.
-- ═══════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════
-- 0001_init.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- AURVI commerce platform — initial schema
-- Covers the full domain model. Phase 1 wires up a subset in the UI;
-- everything else exists so later phases don't require a re-migration.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create schema if not exists app;

-- Generic updated_at trigger
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. IDENTITY & ACCESS
-- ─────────────────────────────────────────────────────────────────────────

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function app.set_updated_at();

-- New auth.users row -> auto-create profile
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

create table public.roles (
  id smallint generated always as identity primary key,
  code text not null unique, -- SUPER_ADMIN, ADMIN, PRODUCT_MANAGER, ORDER_MANAGER, SUPPORT_AGENT, MARKETING_MANAGER, ANALYST
  name text not null,
  description text
);

create table public.permissions (
  id smallint generated always as identity primary key,
  code text not null unique -- e.g. product:create, order:update_status
);

create table public.role_permissions (
  role_id smallint not null references public.roles (id) on delete cascade,
  permission_id smallint not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id smallint not null references public.roles (id) on delete cascade,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index idx_user_roles_user on public.user_roles (user_id);

-- Central permission check used by RLS policies.
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.code = perm
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code in ('SUPER_ADMIN', 'ADMIN')
  );
$$;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  phone text not null,
  alternate_phone text,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  district text,
  state text not null,
  postal_code text not null,
  country text not null default 'IN',
  address_type text not null default 'home' check (address_type in ('home', 'work', 'other')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_addresses_user on public.addresses (user_id);

create trigger trg_addresses_updated_at
  before update on public.addresses
  for each row execute function app.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. CATALOGUE
-- ─────────────────────────────────────────────────────────────────────────

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_parent on public.categories (parent_id);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function app.set_updated_at();

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_collections_updated_at
  before update on public.collections
  for each row execute function app.set_updated_at();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- "Size", "Metal Colour", "Stone"
  slug text not null unique,
  sort_order integer not null default 0
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null, -- "7", "Rose Gold", "Emerald"
  slug text not null,
  sort_order integer not null default 0,
  unique (attribute_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text unique,
  short_description text,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  material text,
  metal text,
  plating text,
  stone text,
  occasion text,
  style text,
  gender_target text check (gender_target in ('women', 'men', 'unisex', 'kids')),
  weight_grams numeric(10, 2),
  dimensions text,
  care_instructions text,
  packaging_details text,
  base_price numeric(12, 2) not null check (base_price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  cost_price numeric(12, 2),
  tax_percent numeric(5, 2) not null default 3,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category on public.products (category_id);
create index idx_products_status on public.products (status);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function app.set_updated_at();

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.product_tags (
  product_id uuid not null references public.products (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (product_id, tag_id)
);

create table public.product_relations (
  product_id uuid not null references public.products (id) on delete cascade,
  related_product_id uuid not null references public.products (id) on delete cascade,
  relation_type text not null check (relation_type in ('related', 'upsell', 'cross_sell')),
  sort_order integer not null default 0,
  primary key (product_id, related_product_id, relation_type),
  check (product_id <> related_product_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  price numeric(12, 2) not null check (price >= 0),
  sale_price numeric(12, 2) check (sale_price is null or sale_price >= 0),
  weight_grams numeric(10, 2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved_quantity <= stock_quantity)
);

create index idx_variants_product on public.product_variants (product_id);

create trigger trg_variants_updated_at
  before update on public.product_variants
  for each row execute function app.set_updated_at();

create table public.variant_attribute_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  attribute_value_id uuid not null references public.attribute_values (id) on delete cascade,
  primary key (variant_id, attribute_value_id)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_product_images_product on public.product_images (product_id);
create index idx_product_images_variant on public.product_images (variant_id);

create table public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  thumbnail_url text,
  sort_order integer not null default 0
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  change_quantity integer not null, -- positive = stock in, negative = stock out
  reason text not null check (
    reason in ('restock', 'manual_adjustment', 'order_reserved', 'order_released', 'order_committed', 'return')
  ),
  reference_type text, -- 'order', 'manual'
  reference_id uuid,
  note text,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_inventory_movements_variant on public.inventory_movements (variant_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. WISHLIST & CART
-- ─────────────────────────────────────────────────────────────────────────

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (wishlist_id, product_id, variant_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  guest_token uuid unique, -- set for anonymous carts, stored in an httpOnly cookie
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token is not null)
);

create unique index idx_carts_user_active on public.carts (user_id) where status = 'active' and user_id is not null;

create trigger trg_carts_updated_at
  before update on public.carts
  for each row execute function app.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  saved_for_later boolean not null default false,
  added_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. PROMOTIONS
-- ─────────────────────────────────────────────────────────────────────────

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed', 'free_shipping')),
  discount_value numeric(12, 2) not null default 0,
  min_order_amount numeric(12, 2) not null default 0,
  max_discount_amount numeric(12, 2),
  usage_limit_total integer,
  usage_limit_per_user integer not null default 1,
  is_first_order_only boolean not null default false,
  customer_id uuid references auth.users (id), -- null = public coupon
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.coupon_rules (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  scope_type text not null check (scope_type in ('category', 'collection', 'product')),
  scope_id uuid not null
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  user_id uuid not null references auth.users (id),
  order_id uuid,
  redeemed_at timestamptz not null default now()
);

create index idx_coupon_redemptions_user on public.coupon_redemptions (coupon_id, user_id);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null,
  scope_type text not null check (scope_type in ('all', 'category', 'collection', 'product')),
  scope_id uuid,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  priority integer not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. ORDERS & PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────

create sequence if not exists public.order_number_seq start 100001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('AUR-' || nextval('public.order_number_seq')::text),
  user_id uuid not null references auth.users (id),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery',
               'delivered', 'cancelled', 'return_requested', 'returned', 'refund_pending', 'refunded')
  ),
  payment_status text not null default 'created' check (
    payment_status in ('created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')
  ),
  subtotal_amount numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  currency text not null default 'INR',
  coupon_id uuid references public.coupons (id),
  coupon_code text,
  customer_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user on public.orders (user_id);
create index idx_orders_status on public.orders (status);
create index idx_orders_payment_status on public.orders (payment_status);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function app.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  sku text not null,
  image_url text,
  unit_price numeric(12, 2) not null,
  quantity integer not null check (quantity > 0),
  line_subtotal numeric(12, 2) not null,
  line_discount numeric(12, 2) not null default 0,
  line_tax numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null
);

create index idx_order_items_order on public.order_items (order_id);

create table public.order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  address_type text not null check (address_type in ('shipping', 'billing')),
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  district text,
  state text not null,
  postal_code text not null,
  country text not null default 'IN'
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index idx_order_status_history_order on public.order_status_history (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text not null,
  provider_payment_id text,
  status text not null default 'created' check (
    status in ('created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded')
  ),
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  method text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_order on public.payments (order_id);
create unique index idx_payments_provider_order on public.payments (provider, provider_order_id);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function app.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments (id) on delete set null,
  provider text not null default 'razorpay',
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  provider_refund_id text,
  amount numeric(12, 2) not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  initiated_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status text not null default 'pending' check (
    status in ('pending', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
  ),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_shipments_order on public.shipments (order_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. REVIEWS
-- ─────────────────────────────────────────────────────────────────────────

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_item_id uuid references public.order_items (id),
  rating smallint not null check (rating between 1 and 5),
  title text,
  content text,
  is_verified_purchase boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  helpful_count integer not null default 0,
  reported_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index idx_reviews_product on public.reviews (product_id, moderation_status);

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function app.set_updated_at();

create table public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. ENGAGEMENT & ANALYTICS
-- ─────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null, -- order_confirmed, order_shipped, back_in_stock, price_drop, ...
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications (user_id, read_at);

create table public.recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  product_id uuid not null references public.products (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);

create unique index idx_recently_viewed_user_product on public.recently_viewed (user_id, product_id) where user_id is not null;
create unique index idx_recently_viewed_session_product on public.recently_viewed (session_id, product_id) where session_id is not null;

create table public.search_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  session_id text,
  query text not null,
  result_count integer not null default 0,
  clicked_product_id uuid references public.products (id),
  created_at timestamptz not null default now()
);

create index idx_search_events_query on public.search_events (lower(query));

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users (id),
  session_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_name_time on public.analytics_events (event_name, created_at desc);

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. MERCHANDISING (admin-configurable homepage)
-- ─────────────────────────────────────────────────────────────────────────

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null, -- hero, featured_collections, new_arrivals, best_sellers, testimonials, ...
  title text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  config jsonb not null default '{}'::jsonb, -- product ids, collection id, CTA label/link, etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_homepage_sections_updated_at
  before update on public.homepage_sections
  for each row execute function app.set_updated_at();

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  link_url text,
  position text not null default 'hero' check (position in ('hero', 'announcement', 'category_top')),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index idx_audit_logs_actor on public.audit_logs (actor_id);


-- ═══════════════════════════════════════════════════════════════════════
-- 0002_rls.sql
-- ═══════════════════════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════════════════════
-- 0003_seed_rbac.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- RBAC seed data — roles, permissions, and the default role/permission grid.
-- This is real application data (not dev-only fixtures), so it lives in a
-- migration rather than supabase/seed.sql.
-- ════════════════════════════════════════════════════════════════════════

insert into public.roles (code, name, description) values
  ('SUPER_ADMIN', 'Super Admin', 'Full access, including managing other admins'' roles'),
  ('ADMIN', 'Admin', 'Full store access excluding role/permission management'),
  ('PRODUCT_MANAGER', 'Product Manager', 'Manages catalogue and inventory'),
  ('ORDER_MANAGER', 'Order Manager', 'Manages orders, shipments, and refunds'),
  ('SUPPORT_AGENT', 'Support Agent', 'Read-only order and customer access for support'),
  ('MARKETING_MANAGER', 'Marketing Manager', 'Manages coupons, promotions, and homepage merchandising'),
  ('ANALYST', 'Analyst', 'Read-only analytics access')
on conflict (code) do nothing;

insert into public.permissions (code) values
  ('product:manage'),
  ('product:create'),
  ('product:update'),
  ('product:delete'),
  ('product:read'),
  ('inventory:read'),
  ('inventory:adjust'),
  ('order:read'),
  ('order:update_status'),
  ('refund:create'),
  ('customer:read'),
  ('analytics:read'),
  ('coupon:manage'),
  ('marketing:manage'),
  ('review:moderate'),
  ('admin:manage')
on conflict (code) do nothing;

-- SUPER_ADMIN: every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

-- ADMIN: every permission except admin:manage
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ADMIN' and p.code <> 'admin:manage'
on conflict do nothing;

-- PRODUCT_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'PRODUCT_MANAGER'
  and p.code in ('product:manage', 'product:create', 'product:update', 'product:delete', 'product:read', 'inventory:read', 'inventory:adjust')
on conflict do nothing;

-- ORDER_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ORDER_MANAGER'
  and p.code in ('order:read', 'order:update_status', 'refund:create', 'customer:read', 'inventory:read')
on conflict do nothing;

-- SUPPORT_AGENT
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'SUPPORT_AGENT'
  and p.code in ('order:read', 'customer:read')
on conflict do nothing;

-- MARKETING_MANAGER
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'MARKETING_MANAGER'
  and p.code in ('marketing:manage', 'coupon:manage', 'analytics:read', 'product:read')
on conflict do nothing;

-- ANALYST
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'ANALYST'
  and p.code in ('analytics:read', 'order:read', 'customer:read', 'product:read')
on conflict do nothing;


-- ═══════════════════════════════════════════════════════════════════════
-- 0004_inventory_functions.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- Atomic inventory operations.
--
-- Reservation uses a single conditional UPDATE (not read-then-write), so
-- concurrent checkouts on the same variant cannot both succeed past
-- available stock — Postgres serializes the row update.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.reserve_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_qty <= 0 then
    raise exception 'quantity must be positive';
  end if;

  update public.product_variants
  set reserved_quantity = reserved_quantity + p_qty
  where id = p_variant_id
    and is_active = true
    and stock_quantity - reserved_quantity >= p_qty;

  get diagnostics v_updated = row_count;

  if v_updated = 1 then
    insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
    values (p_variant_id, -p_qty, 'order_reserved', 'order', p_reference_id);
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.release_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    return;
  end if;

  update public.product_variants
  set reserved_quantity = greatest(0, reserved_quantity - p_qty)
  where id = p_variant_id;

  insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
  values (p_variant_id, p_qty, 'order_released', 'order', p_reference_id);
end;
$$;

-- Finalizes a sale: permanently removes stock that was reserved.
create or replace function public.commit_variant_stock(
  p_variant_id uuid,
  p_qty integer,
  p_reference_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty <= 0 then
    return;
  end if;

  update public.product_variants
  set stock_quantity = greatest(0, stock_quantity - p_qty),
      reserved_quantity = greatest(0, reserved_quantity - p_qty)
  where id = p_variant_id;

  insert into public.inventory_movements (variant_id, change_quantity, reason, reference_type, reference_id)
  values (p_variant_id, -p_qty, 'order_committed', 'order', p_reference_id);
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- 0005_cart_coupon_and_settings.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- Cart coupon reference + store settings (shipping/tax config, admin-editable)
-- ════════════════════════════════════════════════════════════════════════

alter table public.carts
  add column coupon_id uuid references public.coupons (id) on delete set null;

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger trg_store_settings_updated_at
  before update on public.store_settings
  for each row execute function app.set_updated_at();

insert into public.store_settings (key, value) values
  ('shipping', '{"flatFee": 99, "freeAboveAmount": 2000}'),
  ('tax', '{"defaultPercent": 3}')
on conflict (key) do nothing;

insert into public.permissions (code) values ('settings:manage')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code in ('SUPER_ADMIN', 'ADMIN') and p.code = 'settings:manage'
on conflict do nothing;

alter table public.store_settings enable row level security;
create policy store_settings_public_read on public.store_settings for select
  to anon, authenticated using (true);
create policy store_settings_admin_write on public.store_settings for all
  to authenticated using (public.has_permission('settings:manage')) with check (public.has_permission('settings:manage'));


-- ═══════════════════════════════════════════════════════════════════════
-- 0006_wishlist_partial_unique.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- wishlist_items.unique(wishlist_id, product_id, variant_id) never fires
-- for product-level (variant_id IS NULL) wishlist entries, since NULL is
-- never equal to NULL in a unique constraint. Add a partial unique index
-- covering the NULL case so upsert-based dedup actually works.
-- ════════════════════════════════════════════════════════════════════════

create unique index idx_wishlist_items_product_no_variant
  on public.wishlist_items (wishlist_id, product_id)
  where variant_id is null;


-- ═══════════════════════════════════════════════════════════════════════
-- 0007_grants.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- Postgres checks table-level GRANTs before RLS policies ever run — RLS
-- alone does not expose a table to PostgREST or to service_role. RLS
-- bypass for service_role only skips row-level policies; the base table
-- privilege is still required. Grant broad table access to all three
-- API roles and let RLS (every table has it enabled, see 0002_rls.sql)
-- do the actual row/operation-level restriction for anon/authenticated.
-- ════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;


-- ═══════════════════════════════════════════════════════════════════════
-- 0008_order_reservation_expiry.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════
-- Reservation expiry: stock is reserved when a pending order + Razorpay
-- order are created at checkout. If the customer never completes payment
-- (closes the tab, lets the session go stale), this sweep releases the
-- hold so it doesn't starve other customers indefinitely.
--
-- release_expired_order_reservations() is safe to invoke repeatedly and
-- concurrently — it only touches orders still in payment_status='created'
-- past their expiry. Wire it to a scheduler (pg_cron, or an external cron
-- hitting a protected route) — see README "Operations" section.
-- ════════════════════════════════════════════════════════════════════════

alter table public.orders
  add column reservation_expires_at timestamptz;

create or replace function public.release_expired_order_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where payment_status = 'created'
      and reservation_expires_at is not null
      and reservation_expires_at < now()
      and status = 'pending'
    for update skip locked
  loop
    for v_item in
      select variant_id, quantity from public.order_items where order_id = v_order.id and variant_id is not null
    loop
      perform public.release_variant_stock(v_item.variant_id, v_item.quantity, v_order.id);
    end loop;

    update public.orders
    set status = 'cancelled', payment_status = 'failed'
    where id = v_order.id;

    insert into public.order_status_history (order_id, status, note)
    values (v_order.id, 'cancelled', 'Reservation expired before payment was completed');

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

