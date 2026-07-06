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
