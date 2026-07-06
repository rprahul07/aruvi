import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AttributeValue,
  Category,
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariant,
} from "@/types/domain";

const PRODUCT_SUMMARY_SELECT = `
  id, name, slug, short_description, base_price, sale_price,
  category:categories ( id, name, slug ),
  product_images ( id, url, alt_text, is_cover, variant_id ),
  product_variants ( id, stock_quantity, reserved_quantity, is_active )
`;

type RawProductRow = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  sale_price: number | null;
  category: { id: string; name: string; slug: string } | null;
  product_images: {
    id: string;
    url: string;
    alt_text: string | null;
    is_cover: boolean;
    variant_id: string | null;
  }[];
  product_variants: { id: string; stock_quantity: number; reserved_quantity: number; is_active: boolean }[];
};

function toProductSummary(row: RawProductRow): ProductSummary {
  const cover =
    row.product_images.find((img) => img.is_cover) ?? row.product_images[0] ?? null;
  const inStock = row.product_variants.some(
    (v) => v.is_active && v.stock_quantity - v.reserved_quantity > 0,
  );

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

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "base_price", ascending: true },
  price_desc: { column: "base_price", ascending: false },
  recommended: { column: "created_at", ascending: false },
};

export async function getProductsByCollectionSlug(
  slug: string,
  opts: { limit?: number; offset?: number; sort?: string } = {},
): Promise<{ products: ProductSummary[]; total: number }> {
  const supabase = await createClient();
  const { limit = 24, offset = 0, sort = "recommended" } = opts;
  const sortConfig = SORT_MAP[sort] ?? SORT_MAP.recommended!;

  const { data, error, count } = await supabase
    .from("products")
    .select(
      `${PRODUCT_SUMMARY_SELECT}, product_collections!inner ( collections!inner ( slug ) )`,
      { count: "exact" },
    )
    .eq("status", "active")
    .eq("product_collections.collections.slug", slug)
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { products: (data as unknown as RawProductRow[]).map(toProductSummary), total: count ?? 0 };
}

export async function getProductsByCategorySlug(
  slug: string,
  opts: { limit?: number; offset?: number; sort?: string } = {},
): Promise<{ products: ProductSummary[]; total: number }> {
  const supabase = await createClient();
  const { limit = 24, offset = 0, sort = "recommended" } = opts;

  const DEFAULT_SORT = { column: "created_at", ascending: false };
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    newest: { column: "created_at", ascending: false },
    price_asc: { column: "base_price", ascending: true },
    price_desc: { column: "base_price", ascending: false },
    recommended: DEFAULT_SORT,
  };
  const sortConfig = sortMap[sort] ?? DEFAULT_SORT;

  const { data, error, count } = await supabase
    .from("products")
    .select(`${PRODUCT_SUMMARY_SELECT}, categories!inner ( slug )`, { count: "exact" })
    .eq("status", "active")
    .eq("categories.slug", slug)
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { products: (data as unknown as RawProductRow[]).map(toProductSummary), total: count ?? 0 };
}

export async function getProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SUMMARY_SELECT)
    .eq("status", "active")
    .in("id", ids);

  if (error) throw error;
  return (data as unknown as RawProductRow[]).map(toProductSummary);
}

export async function getAllCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, parent_id")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image_url,
    parentId: c.parent_id,
  }));
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, short_description, description, base_price, sale_price, tax_percent,
      material, metal, plating, stone, occasion, style, care_instructions,
      category:categories ( id, name, slug ),
      product_images ( id, url, alt_text, is_cover, variant_id ),
      product_collections ( collections ( id, name, slug ) ),
      product_variants (
        id, sku, price, sale_price, stock_quantity, reserved_quantity, low_stock_threshold, is_active,
        product_images ( id, url, alt_text, is_cover, variant_id ),
        variant_attribute_values (
          attribute_values ( id, value, slug, attributes ( id, name, slug ) )
        )
      )
    `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const images: ProductImage[] = data.product_images
    .filter((img) => !img.variant_id)
    .map((img) => ({ id: img.id, url: img.url, altText: img.alt_text, isCover: img.is_cover, variantId: null }));

  const variants: ProductVariant[] = data.product_variants.map((v) => {
    const attributeValues: AttributeValue[] = v.variant_attribute_values.map((vav) => ({
      id: vav.attribute_values.id,
      attributeId: vav.attribute_values.attributes.id,
      attributeName: vav.attribute_values.attributes.name,
      attributeSlug: vav.attribute_values.attributes.slug,
      value: vav.attribute_values.value,
      slug: vav.attribute_values.slug,
    }));

    return {
      id: v.id,
      productId: data.id,
      sku: v.sku,
      price: Number(v.price),
      salePrice: v.sale_price != null ? Number(v.sale_price) : null,
      stockQuantity: v.stock_quantity,
      reservedQuantity: v.reserved_quantity,
      availableQuantity: Math.max(0, v.stock_quantity - v.reserved_quantity),
      lowStockThreshold: v.low_stock_threshold,
      isActive: v.is_active,
      attributeValues,
      images: v.product_images.map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.alt_text,
        isCover: img.is_cover,
        variantId: img.variant_id,
      })),
    };
  });

  const cover = images.find((i) => i.isCover) ?? images[0] ?? null;
  const inStock = variants.some((v) => v.isActive && v.availableQuantity > 0);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    shortDescription: data.short_description,
    description: data.description,
    basePrice: Number(data.base_price),
    salePrice: data.sale_price != null ? Number(data.sale_price) : null,
    taxPercent: Number(data.tax_percent),
    material: data.material,
    metal: data.metal,
    plating: data.plating,
    stone: data.stone,
    occasion: data.occasion,
    style: data.style,
    careInstructions: data.care_instructions,
    category: data.category,
    coverImage: cover,
    images,
    variants,
    collections: data.product_collections.map((pc) => pc.collections),
    ratingAverage: null,
    ratingCount: 0,
    inStock,
  };
}
