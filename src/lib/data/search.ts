import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductSummary } from "@/types/domain";

const PRODUCT_SUMMARY_SELECT = `
  id, name, slug, short_description, base_price, sale_price,
  category:categories ( id, name, slug ),
  product_images ( id, url, alt_text, is_cover, variant_id ),
  product_variants ( id, stock_quantity, reserved_quantity, is_active )
`;

type RawProductRow = Parameters<typeof toSummary>[0];

function toSummary(row: {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  sale_price: number | null;
  category: { id: string; name: string; slug: string } | null;
  product_images: { id: string; url: string; alt_text: string | null; is_cover: boolean; variant_id: string | null }[];
  product_variants: { id: string; stock_quantity: number; reserved_quantity: number; is_active: boolean }[];
}): ProductSummary {
  const cover = row.product_images.find((i) => i.is_cover) ?? row.product_images[0] ?? null;
  const inStock = row.product_variants.some((v) => v.is_active && v.stock_quantity - v.reserved_quantity > 0);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    basePrice: Number(row.base_price),
    salePrice: row.sale_price != null ? Number(row.sale_price) : null,
    coverImage: cover
      ? { id: cover.id, url: cover.url, altText: cover.alt_text, isCover: cover.is_cover, variantId: cover.variant_id }
      : null,
    category: row.category,
    ratingAverage: null,
    ratingCount: 0,
    inStock,
  };
}

export async function searchProducts(
  query: string,
  opts: { userId?: string | null; sessionId?: string | null } = {},
): Promise<ProductSummary[]> {
  const supabase = await createClient();
  const term = query.trim();
  if (term.length < 2) return [];

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", "active")
    .or(
      `name.ilike.%${term}%,short_description.ilike.%${term}%,material.ilike.%${term}%,occasion.ilike.%${term}%,style.ilike.%${term}%`,
    )
    .limit(24);

  if (error) throw error;
  const results = (data as unknown as RawProductRow[]).map(toSummary);

  const admin = createAdminClient();
  await admin.from("search_events").insert({
    query: term,
    result_count: results.length,
    user_id: opts.userId ?? null,
    session_id: opts.sessionId ?? null,
  });

  return results;
}
