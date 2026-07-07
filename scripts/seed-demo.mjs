// Seeds demo catalog data + creates an admin user on the configured Supabase
// project (reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// .env.local). Idempotent: re-running upserts the same fixed-id rows.
//
//   node scripts/seed-demo.mjs [adminEmail] [adminPassword]
//
// Images use picsum.photos placeholders (allow-listed in next.config.ts).
// Replace with real photography via /admin later.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// --- load .env.local -------------------------------------------------------
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to process.env
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const adminEmail = process.argv[2] ?? "admin@aurvi.local";
const adminPassword = process.argv[3] ?? `Aurvi-${crypto.randomBytes(4).toString("hex")}!`;

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const img = (seed, w = 1000, h = 1250) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// --- fixed-id reference data ----------------------------------------------
const categories = [
  { id: "11111111-1111-1111-a111-111111111101", name: "Rings", slug: "rings", description: "Statement and everyday rings.", sort_order: 1, image_url: img("aurvi-cat-rings", 800, 800) },
  { id: "11111111-1111-1111-a111-111111111102", name: "Earrings", slug: "earrings", description: "Studs, hoops, and drops.", sort_order: 2, image_url: img("aurvi-cat-earrings", 800, 800) },
  { id: "11111111-1111-1111-a111-111111111103", name: "Necklaces", slug: "necklaces", description: "Pendants and chains.", sort_order: 3, image_url: img("aurvi-cat-necklaces", 800, 800) },
  { id: "11111111-1111-1111-a111-111111111104", name: "Bangles", slug: "bangles", description: "Bangles and bracelets.", sort_order: 4, image_url: img("aurvi-cat-bangles", 800, 800) },
];

const collections = [
  { id: "22222222-2222-2222-a222-222222222201", name: "New Arrivals", slug: "new-arrivals", description: "Just landed.", is_active: true, image_url: img("aurvi-col-new", 1200, 800) },
  { id: "22222222-2222-2222-a222-222222222202", name: "Best Sellers", slug: "best-sellers", description: "Customer favourites.", is_active: true, image_url: img("aurvi-col-best", 1200, 800) },
  { id: "22222222-2222-2222-a222-222222222203", name: "Wedding Edit", slug: "wedding-edit", description: "For the big day and beyond.", is_active: true, image_url: img("aurvi-col-wedding", 1200, 800) },
];

const attributes = [
  { id: "33333333-3333-3333-a333-333333333301", name: "Size", slug: "size", sort_order: 1 },
  { id: "33333333-3333-3333-a333-333333333302", name: "Metal Colour", slug: "metal-colour", sort_order: 2 },
];
const attributeValues = [
  { id: "44444444-4444-4444-a444-444444444401", attribute_id: attributes[0].id, value: "6", slug: "6", sort_order: 1 },
  { id: "44444444-4444-4444-a444-444444444402", attribute_id: attributes[0].id, value: "7", slug: "7", sort_order: 2 },
  { id: "44444444-4444-4444-a444-444444444403", attribute_id: attributes[0].id, value: "8", slug: "8", sort_order: 3 },
  { id: "44444444-4444-4444-a444-444444444404", attribute_id: attributes[1].id, value: "Gold", slug: "gold", sort_order: 1 },
  { id: "44444444-4444-4444-a444-444444444405", attribute_id: attributes[1].id, value: "Rose Gold", slug: "rose-gold", sort_order: 2 },
  { id: "44444444-4444-4444-a444-444444444406", attribute_id: attributes[1].id, value: "Silver", slug: "silver", sort_order: 3 },
];

const GOLD = "44444444-4444-4444-a444-444444444404";
const ROSE = "44444444-4444-4444-a444-444444444405";
const SILVER = "44444444-4444-4444-a444-444444444406";
const [RINGS, EARRINGS, NECKLACES, BANGLES] = categories.map((c) => c.id);
const [NEW, BEST, WEDDING] = collections.map((c) => c.id);

// product, its variants, images, and collection membership
const products = [
  {
    id: "55555555-5555-5555-a555-555555555501", name: "Aurelia Butterfly Ring", slug: "aurelia-butterfly-ring", sku: "RING-AUR-001",
    short_description: "A delicate gold-plated butterfly ring for everyday wear.",
    description: "Hand-finished butterfly motif ring in gold-plated brass with cubic zirconia accents.",
    category_id: RINGS, material: "Brass, cubic zirconia", metal: "Gold-plated", occasion: "Daily wear", style: "Minimal",
    base_price: 2499, sale_price: 1999, collections: [NEW], seeds: ["aurvi-ring-1", "aurvi-ring-1b"],
    variants: [
      { sku: "RING-AUR-001-6", price: 2499, sale_price: 1999, stock: 12, attrs: ["44444444-4444-4444-a444-444444444401"] },
      { sku: "RING-AUR-001-7", price: 2499, sale_price: 1999, stock: 8, attrs: ["44444444-4444-4444-a444-444444444402"] },
    ],
  },
  {
    id: "55555555-5555-5555-a555-555555555502", name: "Meridian Hoop Earrings", slug: "meridian-hoop-earrings", sku: "EAR-MER-001",
    short_description: "Classic medium hoops in a warm gold finish.",
    description: "Our most-reached-for hoop — a medium 28mm silhouette in warm gold-plated brass.",
    category_id: EARRINGS, material: "Brass", metal: "Gold-plated", occasion: "Everyday", style: "Classic",
    base_price: 1799, sale_price: null, collections: [BEST], seeds: ["aurvi-ear-1", "aurvi-ear-1b"],
    variants: [
      { sku: "EAR-MER-001-GOLD", price: 1799, sale_price: null, stock: 20, attrs: [GOLD] },
      { sku: "EAR-MER-001-ROSE", price: 1799, sale_price: null, stock: 15, attrs: [ROSE] },
    ],
  },
  {
    id: "55555555-5555-5555-a555-555555555503", name: "Solstice Pendant Necklace", slug: "solstice-pendant-necklace", sku: "NCK-SOL-001",
    short_description: "A sunburst pendant on a fine cable chain.",
    description: "A sculptural sunburst pendant in gold-plated brass on an 18-inch chain.",
    category_id: NECKLACES, material: "Brass", metal: "Gold-plated", occasion: "Gifting", style: "Statement",
    base_price: 3299, sale_price: 2799, collections: [WEDDING, NEW], seeds: ["aurvi-nck-1", "aurvi-nck-1b"],
    variants: [{ sku: "NCK-SOL-001-GOLD", price: 3299, sale_price: 2799, stock: 10, attrs: [GOLD] }],
  },
  {
    id: "55555555-5555-5555-a555-555555555504", name: "Vesper Stacking Bangle", slug: "vesper-stacking-bangle", sku: "BNG-VES-001",
    short_description: "A slim stacking bangle designed to layer.",
    description: "A slim 4mm stacking bangle in gold-plated brass — wear alone or layered.",
    category_id: BANGLES, material: "Brass", metal: "Gold-plated", occasion: "Daily wear", style: "Minimal",
    base_price: 1499, sale_price: null, collections: [BEST], seeds: ["aurvi-bng-1"],
    variants: [
      { sku: "BNG-VES-001-GOLD", price: 1499, sale_price: null, stock: 25, attrs: [GOLD] },
      { sku: "BNG-VES-001-SILVER", price: 1499, sale_price: null, stock: 6, attrs: [SILVER] },
    ],
  },
  {
    id: "55555555-5555-5555-a555-555555555505", name: "Lumen Solitaire Ring", slug: "lumen-solitaire-ring", sku: "RING-LUM-002",
    short_description: "A timeless solitaire with a brilliant-cut stone.",
    description: "A classic solitaire in gold-plated brass set with a 6mm brilliant-cut cubic zirconia.",
    category_id: RINGS, material: "Brass, cubic zirconia", metal: "Gold-plated", occasion: "Bridal", style: "Classic",
    base_price: 4299, sale_price: 3499, collections: [WEDDING, BEST], seeds: ["aurvi-ring-2", "aurvi-ring-2b"],
    variants: [
      { sku: "RING-LUM-002-6", price: 4299, sale_price: 3499, stock: 7, attrs: ["44444444-4444-4444-a444-444444444401"] },
      { sku: "RING-LUM-002-7", price: 4299, sale_price: 3499, stock: 9, attrs: ["44444444-4444-4444-a444-444444444402"] },
      { sku: "RING-LUM-002-8", price: 4299, sale_price: 3499, stock: 4, attrs: ["44444444-4444-4444-a444-444444444403"] },
    ],
  },
  {
    id: "55555555-5555-5555-a555-555555555506", name: "Celeste Drop Earrings", slug: "celeste-drop-earrings", sku: "EAR-CEL-002",
    short_description: "Elegant drop earrings that catch the light.",
    description: "Faceted drops suspended from a delicate gold-plated fitting — evening-ready.",
    category_id: EARRINGS, material: "Brass, cubic zirconia", metal: "Gold-plated", occasion: "Party", style: "Statement",
    base_price: 2299, sale_price: null, collections: [NEW], seeds: ["aurvi-ear-2"],
    variants: [
      { sku: "EAR-CEL-002-GOLD", price: 2299, sale_price: null, stock: 14, attrs: [GOLD] },
      { sku: "EAR-CEL-002-SILVER", price: 2299, sale_price: null, stock: 11, attrs: [SILVER] },
    ],
  },
  {
    id: "55555555-5555-5555-a555-555555555507", name: "Aurora Layered Necklace", slug: "aurora-layered-necklace", sku: "NCK-AUR-002",
    short_description: "A pre-layered double chain for instant styling.",
    description: "Two fine chains in one clasp for an effortless layered look in gold-plated brass.",
    category_id: NECKLACES, material: "Brass", metal: "Gold-plated", occasion: "Everyday", style: "Minimal",
    base_price: 2799, sale_price: 2299, collections: [BEST, NEW], seeds: ["aurvi-nck-2", "aurvi-nck-2b"],
    variants: [{ sku: "NCK-AUR-002-GOLD", price: 2799, sale_price: 2299, stock: 13, attrs: [GOLD] }],
  },
  {
    id: "55555555-5555-5555-a555-555555555508", name: "Nova Cuff Bangle", slug: "nova-cuff-bangle", sku: "BNG-NOV-002",
    short_description: "A bold open cuff with a hammered finish.",
    description: "A sculptural open cuff in gold-plated brass with a hand-hammered texture.",
    category_id: BANGLES, material: "Brass", metal: "Gold-plated", occasion: "Party", style: "Statement",
    base_price: 1999, sale_price: null, collections: [WEDDING], seeds: ["aurvi-bng-2"],
    variants: [{ sku: "BNG-NOV-002-GOLD", price: 1999, sale_price: null, stock: 18, attrs: [GOLD] }],
  },
];

const homepageSections = [
  { section_type: "hero", title: null, is_enabled: true, sort_order: 0, config: { headline: "For Moments Worth Marking", subheadline: "New season jewellery", ctaLabel: "Shop New Arrivals", ctaHref: "/collections/new-arrivals" } },
  { section_type: "featured_collections", title: "Shop by Collection", is_enabled: true, sort_order: 1, config: { collectionSlugs: ["new-arrivals", "wedding-edit", "best-sellers"] } },
  { section_type: "new_arrivals", title: "New Arrivals", is_enabled: true, sort_order: 2, config: { collectionSlug: "new-arrivals", limit: 8 } },
  { section_type: "best_sellers", title: "Best Sellers", is_enabled: true, sort_order: 3, config: { collectionSlug: "best-sellers", limit: 8 } },
];

async function check(label, { error }) {
  if (error) {
    console.error(`✗ ${label}:`, error.message);
    throw error;
  }
  console.log(`✓ ${label}`);
}

async function main() {
  console.log(`Seeding ${url} ...\n`);

  await check("categories", await db.from("categories").upsert(categories, { onConflict: "id" }));
  await check("collections", await db.from("collections").upsert(collections, { onConflict: "id" }));
  await check("attributes", await db.from("attributes").upsert(attributes, { onConflict: "id" }));
  await check("attribute_values", await db.from("attribute_values").upsert(attributeValues, { onConflict: "id" }));

  // products
  const productRows = products.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, sku: p.sku, short_description: p.short_description, description: p.description,
    category_id: p.category_id, material: p.material, metal: p.metal, occasion: p.occasion, style: p.style,
    gender_target: "women", base_price: p.base_price, sale_price: p.sale_price, tax_percent: 3, status: "active",
  }));
  await check("products", await db.from("products").upsert(productRows, { onConflict: "id" }));

  // product_collections
  const pcRows = products.flatMap((p) => p.collections.map((cid) => ({ product_id: p.id, collection_id: cid })));
  await check("product_collections", await db.from("product_collections").upsert(pcRows, { onConflict: "product_id,collection_id" }));

  // variants (deterministic ids so re-runs upsert)
  const variantRows = [];
  const vavRows = [];
  const imageRows = [];
  for (const p of products) {
    p.variants.forEach((v, i) => {
      const vid = crypto.createHash("md5").update(v.sku).digest("hex");
      const variantId = `${vid.slice(0, 8)}-${vid.slice(8, 12)}-4${vid.slice(13, 16)}-a${vid.slice(17, 20)}-${vid.slice(20, 32)}`;
      variantRows.push({ id: variantId, product_id: p.id, sku: v.sku, price: v.price, sale_price: v.sale_price, stock_quantity: v.stock, low_stock_threshold: 3, is_active: true });
      for (const a of v.attrs) vavRows.push({ variant_id: variantId, attribute_value_id: a });
    });
    p.seeds.forEach((seed, i) => {
      imageRows.push({ product_id: p.id, url: img(seed), alt_text: p.name, sort_order: i, is_cover: i === 0 });
    });
  }
  await check("product_variants", await db.from("product_variants").upsert(variantRows, { onConflict: "sku" }));
  await check("variant_attribute_values", await db.from("variant_attribute_values").upsert(vavRows, { onConflict: "variant_id,attribute_value_id" }));

  // images — clear existing for these products first so re-runs don't duplicate
  await db.from("product_images").delete().in("product_id", products.map((p) => p.id));
  await check("product_images", await db.from("product_images").insert(imageRows));

  // homepage sections — replace all
  await db.from("homepage_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await check("homepage_sections", await db.from("homepage_sections").insert(homepageSections));

  // announcement banner
  await db.from("banners").delete().eq("position", "announcement");
  await check("announcement banner", await db.from("banners").insert([{ title: "Free shipping across India · AURVI", image_url: "none", position: "announcement", is_active: true, sort_order: 0 }]));

  // --- admin user ----------------------------------------------------------
  console.log("\nCreating admin user ...");
  let userId;
  const created = await db.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
  if (created.error) {
    if (/already|registered|exists/i.test(created.error.message)) {
      // find existing user by email
      const list = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
      if (!existing) throw created.error;
      userId = existing.id;
      console.log(`✓ admin user already existed (${adminEmail}) — granting role`);
    } else {
      throw created.error;
    }
  } else {
    userId = created.data.user.id;
    console.log(`✓ created admin user ${adminEmail}`);
  }

  const role = await db.from("roles").select("id").eq("code", "SUPER_ADMIN").single();
  if (role.error) throw role.error;
  await check("granted SUPER_ADMIN", await db.from("user_roles").upsert({ user_id: userId, role_id: role.data.id }, { onConflict: "user_id,role_id" }));

  console.log("\n──────────────────────────────────────────────");
  console.log("  Seed complete.");
  console.log(`  Admin login:  ${adminEmail}`);
  if (!process.argv[3]) console.log(`  Password:     ${adminPassword}   (change this after first login)`);
  console.log("──────────────────────────────────────────────");
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message ?? e);
  process.exit(1);
});
