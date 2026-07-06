# AURVI — Jewellery E-Commerce Platform

A production-grade, mobile-first jewellery commerce platform built on **Next.js 16 (App Router)** and **Supabase (Postgres + Auth + Storage)**, with **Razorpay** payments. Deploys to **Cloudflare Workers** (via OpenNext) or any Node host / Vercel.

> **Brand note:** `AURVI` is a placeholder identity created for this build (no trademark check performed). Swap the values in [`src/lib/constants/brand.ts`](src/lib/constants/brand.ts) and the design tokens in [`src/app/globals.css`](src/app/globals.css) for your real brand before launch. Seed product photography uses `picsum.photos` placeholders — replace with real imagery in Supabase Storage.

---

## Table of contents

1. [Architecture summary](#architecture-summary)
2. [Directory structure](#directory-structure)
3. [Database schema summary](#database-schema-summary)
4. [API endpoint inventory](#api-endpoint-inventory)
5. [Authentication flow](#authentication-flow)
6. [Razorpay payment flow](#razorpay-payment-flow)
7. [Webhook flow](#webhook-flow)
8. [Environment variables](#environment-variables)
9. [Local development](#local-development)
10. [Admin bootstrap](#admin-bootstrap)
11. [Testing](#testing)
12. [Production deployment](#production-deployment)
13. [Operations (cron / reservations)](#operations)
14. [What's built vs. planned](#whats-built-vs-planned)
15. [Known limitations](#known-limitations)

---

## Architecture summary

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router (React 19, Turbopack) |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Payments | Razorpay via REST `fetch` (no Node SDK) — server-created orders + signature + webhook verification |
| Deploy target | Cloudflare Workers (OpenNext adapter) — also runs on Node/Vercel |
| Data access | Server Components + Route Handlers; **no client-side DB writes for money paths** |
| Validation | Zod at every API boundary |
| Tests | Vitest (unit) + direct SQL verification of inventory functions |

**Security model.** Public catalogue reads and each user's own rows are guarded by
Postgres **Row Level Security**. All privileged mutations (cart pricing, checkout,
payment capture, admin writes) run in **Route Handlers** using the Supabase
service-role key, which bypasses RLS — so those routes perform an **explicit,
database-backed authorization check** first ([`src/lib/auth/authorize.ts`](src/lib/auth/authorize.ts),
[`src/lib/auth/admin-context.ts`](src/lib/auth/admin-context.ts)). Hiding a frontend button is never
treated as authorization. Prices, discounts, tax, stock and payment status are
**always** recomputed and verified server-side; the browser's numbers are never trusted.

---

## Directory structure

```
src/
  app/
    (auth)/            login, register, forgot/reset password
    account/           profile, orders, addresses (protected)
    admin/             dashboard, products, inventory, orders, categories (RBAC)
    api/
      health/          liveness + readiness probe
      v1/
        cart/          cart CRUD, coupon, guest-merge
        wishlist/      wishlist CRUD, guest-merge
        addresses/     address CRUD
        account/       profile update
        products/      public product lookup by id
        search/        product search (logs search_events)
        checkout/      initiate, verify, fail
        webhooks/      razorpay receiver
        admin/         products, categories, inventory, orders, cron
    category/[slug]/   category listing (sort + pagination)
    collections/[slug] collection listing
    products/[slug]/   product detail page (variants, gallery, JSON-LD)
    cart/ checkout/ wishlist/ search/ categories/
  components/
    ui/                button, input, badge, sheet, skeleton, price-tag, empty-state
    layout/            header, footer, announcement bar, mobile bottom nav
    product/           product card, gallery, add-to-cart panel, wishlist button
    cart/ account/ admin/
  lib/
    supabase/          client (browser), server (RLS), admin (service role)
    auth/              authorize, admin-context
    cart/              identity (guest cookie), cart-service, coupon
    checkout/          checkout-service, payment-service
    razorpay/          client (signature verify), checkout (browser SDK loader)
    data/              catalog, orders, addresses, search, admin-* read layers
    audit/             audit-log
    validators/        zod schemas
    constants/         brand, order-status
    store/             auth / cart / wishlist React contexts
  types/               domain.ts, database.types.ts (generated)
  proxy.ts             session refresh + route protection (Next 16 "proxy")
supabase/
  migrations/          0001..0008 schema, RLS, RBAC, inventory fns, grants
  seed.sql             dev fixtures (categories, products, variants, images)
scripts/
  grant-admin.mjs      bootstrap an admin by email
```

---

## Database schema summary

Migrations live in [`supabase/migrations`](supabase/migrations) and are applied in order.

- **Identity & access:** `user_profiles`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `addresses`. A trigger auto-creates a profile on signup.
  `has_permission()` / `is_admin()` SQL functions back both RLS and app checks.
- **Catalogue:** `categories`, `collections`, `tags`, `attributes`, `attribute_values`,
  `products`, `product_variants`, `variant_attribute_values`, `product_images`,
  `product_videos`, `product_collections`, `product_tags`, `product_relations`.
- **Inventory:** `inventory_movements` + atomic functions `reserve_variant_stock`,
  `release_variant_stock`, `commit_variant_stock` (single conditional UPDATE →
  cannot oversell under concurrency).
- **Cart & wishlist:** `carts` (user or guest-token), `cart_items`, `wishlists`,
  `wishlist_items`.
- **Promotions:** `coupons`, `coupon_rules`, `coupon_redemptions`, `promotions`.
- **Orders & payments:** `orders` (separate `status` and `payment_status` state
  machines), `order_items`, `order_addresses`, `order_status_history`, `payments`,
  `payment_events` (idempotency), `refunds`, `shipments`.
- **Engagement:** `reviews`, `review_images`, `notifications`, `recently_viewed`,
  `search_events`, `analytics_events`, `newsletter_subscriptions`.
- **Merchandising:** `homepage_sections`, `banners`, `store_settings`.
- **Audit:** `audit_logs`.

RLS is enabled on every table ([`0002_rls.sql`](supabase/migrations/0002_rls.sql)); table
grants for `anon`/`authenticated`/`service_role` are in
[`0007_grants.sql`](supabase/migrations/0007_grants.sql).

Regenerate TypeScript types after any schema change:

```bash
npm run db:types
```

---

## API endpoint inventory

All responses use a consistent envelope:
`{ success: true, data, meta }` or `{ success: false, error: { code, message } }`.

### Public / customer
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + DB readiness |
| GET | `/api/v1/cart` | Current cart (guest or user) |
| POST | `/api/v1/cart/items` | Add item (stock-validated) |
| PATCH/DELETE | `/api/v1/cart/items/[itemId]` | Update qty / remove |
| POST/DELETE | `/api/v1/cart/coupon` | Apply / remove coupon (auth required) |
| POST | `/api/v1/cart/merge` | Merge guest cart after login |
| GET/POST | `/api/v1/wishlist` | List / add (auth) |
| DELETE | `/api/v1/wishlist/[productId]` | Remove |
| POST | `/api/v1/wishlist/merge` | Merge guest wishlist |
| GET/POST | `/api/v1/addresses` | List / create |
| PATCH/DELETE | `/api/v1/addresses/[addressId]` | Update / delete |
| PATCH | `/api/v1/account/profile` | Update profile |
| GET | `/api/v1/products?ids=` | Products by id (wishlist hydration) |
| GET | `/api/v1/search?q=` | Product search |
| POST | `/api/v1/checkout/initiate` | Create pending order + Razorpay order |
| POST | `/api/v1/checkout/verify` | Verify payment signature, confirm order |
| POST | `/api/v1/checkout/fail` | Release reservation on modal dismiss |
| POST | `/api/v1/webhooks/razorpay` | Payment webhook (signature + idempotent) |

### Admin (permission-gated server-side)
| Method | Path | Permission |
|---|---|---|
| POST | `/api/v1/admin/products` | `product:manage` |
| PATCH/DELETE | `/api/v1/admin/products/[id]` | `product:manage` |
| POST | `/api/v1/admin/categories` | `product:manage` |
| PATCH | `/api/v1/admin/categories/[id]` | `product:manage` |
| POST | `/api/v1/admin/inventory/[variantId]` | `inventory:adjust` |
| PATCH | `/api/v1/admin/orders/[id]/status` | `order:update_status` |
| POST | `/api/v1/admin/cron/release-reservations` | `Bearer $CRON_SECRET` |

---

## Authentication flow

1. **Email/password** and **Google OAuth** via Supabase Auth.
2. `src/proxy.ts` (Next.js 16 proxy, formerly middleware) refreshes the session
   cookie on every request and gates `/account`, `/checkout`, `/admin` to
   logged-in users.
3. Google OAuth: client calls `signInWithOAuth` → Google → `/auth/callback`
   exchanges the code for a session, then redirects to `?next=`.
4. Admin authorization is a **second, DB-backed layer**: the `/admin` layout and
   every admin route load the user's roles/permissions from Postgres
   ([`admin-context.ts`](src/lib/auth/admin-context.ts) / [`authorize.ts`](src/lib/auth/authorize.ts)).

Guest carts/wishlists live in an httpOnly cookie / localStorage and are **merged
into the user's account on login** (`/api/v1/cart/merge`, `/api/v1/wishlist/merge`).

---

## Razorpay payment flow

```
Customer clicks "Pay"
  → POST /api/v1/checkout/initiate
      · re-reads server cart, recomputes authoritative total
      · creates internal order (status=pending, payment_status=created)
      · reserves stock atomically per line (rolls back all on any failure)
      · creates Razorpay order for the exact paise amount
      · records a payments row (status=created), order → payment_status=pending
      · returns ONLY { razorpayOrderId, amount, currency, keyId } to the browser
  → Razorpay Checkout.js opens (checkout.razorpay.com, loaded on demand)
  → Customer pays
  → handler(response) → POST /api/v1/checkout/verify
      · confirms the razorpay order id maps to this internal order + user
      · verifies HMAC-SHA256(order_id|payment_id, KEY_SECRET) — timing-safe
      · markOrderPaid(): commits reserved stock, order → confirmed / captured,
        redeems coupon, converts cart, writes notification + analytics event
      · idempotent: a second call is a no-op
  → redirect to /checkout/success
```

The **secret key never leaves the server**. The order is never marked paid on the
strength of the client callback alone — the webhook is the independent confirmation.

Failure paths handled: card declined, **modal dismissed** (`/checkout/fail`
releases the reservation), signature mismatch, and reservation timeout (see
[Operations](#operations)).

---

## Webhook flow

`POST /api/v1/webhooks/razorpay`:

1. Verify `X-Razorpay-Signature` against `RAZORPAY_WEBHOOK_SECRET` (timing-safe).
2. Insert into `payment_events` with a `UNIQUE (provider, provider_event_id)`
   constraint — **duplicate deliveries are detected and acknowledged without
   reprocessing**.
3. Dispatch `payment.captured` → `markOrderPaid` (idempotent) or `payment.failed`
   → release reservation.
4. Always returns 2xx once the signature is valid, so Razorpay does not retry
   storm on transient downstream errors (the event is recorded for reconciliation).

Configure the webhook in the Razorpay dashboard pointing at
`https://<your-domain>/api/v1/webhooks/razorpay` for `payment.captured` and
`payment.failed`.

---

## Environment variables

Copy [`.env.example`](.env.example) → `.env.local` and fill in real values.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server only.** Never expose. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google login | Also set in Supabase Auth → Providers |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | for payments | Test-mode keys to start |
| `RAZORPAY_WEBHOOK_SECRET` | for payments | From the webhook config |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | for payments | Safe public key id |
| `CRON_SECRET` | for reservation sweep | `openssl rand -hex 32` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | optional | App runs fine unset |

Mandatory Supabase/Razorpay vars are validated at the point of use (clients throw
a clear error if missing).

---

## Local development

**Prerequisites:** Node 20+/22+, Docker Desktop (for local Supabase), and the
Supabase CLI (bundled as a dev dependency).

```bash
# 1. Install
npm install

# 2. Start local Supabase (Postgres, Auth, Storage) — applies all migrations + seed
npx supabase start

# 3. Point .env.local at the local stack
#    `npx supabase status` prints the API URL, anon key, and service_role key.
#    (A working .env.local for the local stack is generated during setup.)

# 4. Generate DB types (needs GOOGLE_CLIENT_ID/SECRET set to any non-empty value
#    for config.toml parsing — placeholders are fine locally)
npm run db:types

# 5. Run the app
npm run dev            # http://localhost:3000
```

Reset the database (re-apply migrations + reseed) at any time:

```bash
npm run db:reset
```

---

## Admin bootstrap

Admins are users with a role in `user_roles`. To create the first one:

```bash
# The user must have signed up first (email/password or Google).
npm run grant-admin someone@example.com SUPER_ADMIN
```

Roles: `SUPER_ADMIN`, `ADMIN`, `PRODUCT_MANAGER`, `ORDER_MANAGER`,
`SUPPORT_AGENT`, `MARKETING_MANAGER`, `ANALYST`
(permission grid seeded in [`0003_seed_rbac.sql`](supabase/migrations/0003_seed_rbac.sql)).
Then visit `/admin`.

---

## Testing

```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # eslint (next/core-web-vitals + typescript)
npm test              # vitest unit tests
npm run build         # full production build (Node target)
npm run cf:preview    # build for Cloudflare Workers and preview locally
```

Unit tests cover Razorpay signature/webhook verification and order-status
transition rules. The atomic inventory functions are verified directly against
Postgres (see the `reserve/release/commit` behaviour documented in
[`0004_inventory_functions.sql`](supabase/migrations/0004_inventory_functions.sql)).

**Critical journey to verify manually with Razorpay test keys:**
home → category → product → select variant → add to cart → login → address →
checkout → Razorpay test payment → success → order in `/account/orders` → order
visible in `/admin/orders`.

---

## Production deployment (Cloudflare Workers)

This app deploys to **Cloudflare Workers** via the **OpenNext** adapter
(`@opennextjs/cloudflare`). The `razorpay` Node SDK was deliberately replaced with
`fetch` calls so the payment path runs on the Workers runtime; `node:crypto`,
`Buffer`, and `process` work via the `nodejs_compat` flag (set in
[`wrangler.jsonc`](wrangler.jsonc)).

### 1. Supabase (hosted)
```bash
npx supabase link --project-ref <ref>
npx supabase db push          # applies all migrations to the cloud project
```
Enable **Auth → Providers → Google** and add the redirect URL
`https://<your-domain>/auth/callback`. Copy the project URL, anon key, and
service-role key for the next step.

### 2. Configure secrets & vars on Cloudflare
```bash
# Log in and (first time) create the Worker
npx wrangler login

# Server-side SECRETS — never in wrangler.jsonc or git:
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put CRON_SECRET
```
Public / build-time vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`) are inlined at build
time — set them in your CI/build environment (or a Cloudflare build config), and
set the non-public `RAZORPAY_KEY_ID` as a Worker **var** or secret too.

### 3. Build & deploy
```bash
npm run cf:deploy      # opennextjs-cloudflare build && ... deploy
```
Preview the exact Workers runtime locally before deploying:
```bash
cp .dev.vars.example .dev.vars   # fill in values (Cloudflare-runtime env)
npm run cf:preview               # serves the built worker at http://localhost:8787
```

### 4. Razorpay
Register the webhook at `https://<your-domain>/api/v1/webhooks/razorpay` for
`payment.captured` and `payment.failed`; copy its signing secret into the
`RAZORPAY_WEBHOOK_SECRET` Worker secret. Switch to live keys when ready.

### 5. Custom domain & cron
- Add your domain under the Worker's **Settings → Domains & Routes**.
- Schedule the reservation sweep (see [Operations](#operations)).

### Notes for the Workers runtime
- **Images** are served unoptimized on Cloudflare (`next.config.ts` sets
  `images.unoptimized` when `OPEN_NEXT_CLOUDFLARE=1`) because `sharp` isn't
  available on Workers. For optimized delivery, enable **Cloudflare Images** /
  image resizing and add a custom loader.
- **Rate limiting / WAF / bot protection** — configure at the Cloudflare edge
  (Security → WAF, Rate limiting rules) rather than in app code. Recommended:
  throttle `/api/v1/checkout/*`, `/auth/*`, and `/api/v1/webhooks/*`.
- Security headers (HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set in
  [`next.config.ts`](next.config.ts).

> Prefer Vercel instead? It's zero-config for Next.js: set the same env vars in
> the Vercel dashboard and `git push`. The app is not coupled to Cloudflare —
> only the optional `cf:*` scripts and `wrangler.jsonc` are Cloudflare-specific.

---

## Operations

**Reservation sweep.** Checkouts reserve stock for 15 minutes. If payment never
completes, the hold must be released. Schedule an authenticated call:

```bash
curl -X POST https://<domain>/api/v1/admin/cron/release-reservations \
  -H "Authorization: Bearer $CRON_SECRET"
```

Wire this to Vercel Cron, an external scheduler, or Supabase `pg_cron` calling
`select public.release_expired_order_reservations();` directly.

**Health checks.** `GET /api/health` returns 200 when the DB is reachable, 503
otherwise — point your uptime monitor / load balancer here.

---

## What's built vs. planned

**Built and working end-to-end (Phase 1):** design system + tokens · mobile-first
storefront (home, categories, collections, PDP with variants, search, wishlist,
cart) · guest→user cart & wishlist merge · email + Google auth · addresses ·
server-authoritative cart pricing, tax, shipping, and coupons · atomic inventory
reservation · Razorpay checkout with server verification + idempotent webhook ·
order persistence + customer order history · admin (dashboard with real
aggregates, product CRUD, category CRUD, inventory adjustments, order management
with status state machine) · server-enforced RBAC · audit logging · health +
cron endpoints · SEO metadata + product JSON-LD.

**Schema present, UI/logic planned for later phases:** reviews & ratings ·
full analytics dashboards & funnels · notification delivery (email/SMS/WhatsApp
channels — in-app notifications are written today) · recently-viewed &
recommendations · abandoned-cart automation · newsletter · promotions engine
(coupons are complete; automatic promotions table exists) · gift cards / loyalty
/ referrals / drops.

---

## Known limitations

- **Product variant creation** is done via SQL/seed today; the admin product form
  manages the product record and its pricing/status, while variant rows are
  managed through inventory adjustments. A variant CRUD UI is a Phase 2 item.
- **Image upload UI** is not yet wired; product images are seeded/managed in
  Supabase Storage directly. `next.config.ts` allowlists `picsum.photos` for the
  placeholder seed — remove it once real imagery is in Storage.
- **Email/SMS/WhatsApp** notifications have an extensible schema and write in-app
  notifications; outbound channel delivery is stubbed for Phase 2.
- Type generation (`npm run db:types`) needs `GOOGLE_CLIENT_ID`/`SECRET` present
  (any value) so the CLI can parse `config.toml`.
- The seed brand/imagery are placeholders — see the note at the top.
```
