import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  basePrice: number;
  salePrice: number | null;
  categoryName: string | null;
  totalStock: number;
  variantCount: number;
}

export async function listAdminProducts(): Promise<AdminProductListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(
      "id, name, slug, status, base_price, sale_price, categories(name), product_variants(stock_quantity)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => {
    const variants = (p.product_variants as { stock_quantity: number }[]) ?? [];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      basePrice: Number(p.base_price),
      salePrice: p.sale_price != null ? Number(p.sale_price) : null,
      categoryName: (p.categories as { name: string } | null)?.name ?? null,
      totalStock: variants.reduce((sum, v) => sum + v.stock_quantity, 0),
      variantCount: variants.length,
    };
  });
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  categoryId: string | null;
  material: string | null;
  metal: string | null;
  occasion: string | null;
  style: string | null;
  basePrice: number;
  salePrice: number | null;
  taxPercent: number;
  status: string;
}

export async function getAdminProduct(productId: string): Promise<AdminProductDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select(
      "id, name, slug, sku, short_description, description, category_id, material, metal, occasion, style, base_price, sale_price, tax_percent, status",
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    sku: data.sku,
    shortDescription: data.short_description,
    description: data.description,
    categoryId: data.category_id,
    material: data.material,
    metal: data.metal,
    occasion: data.occasion,
    style: data.style,
    basePrice: Number(data.base_price),
    salePrice: data.sale_price != null ? Number(data.sale_price) : null,
    taxPercent: Number(data.tax_percent),
    status: data.status,
  };
}

export interface AdminVariantRow {
  id: string;
  sku: string;
  productName: string;
  price: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export async function listAdminVariants(): Promise<AdminVariantRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("product_variants")
    .select("id, sku, price, stock_quantity, reserved_quantity, low_stock_threshold, is_active, products(name)")
    .order("sku");

  if (error) throw error;

  return (data ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    productName: (v.products as { name: string } | null)?.name ?? "—",
    price: Number(v.price),
    stockQuantity: v.stock_quantity,
    reservedQuantity: v.reserved_quantity,
    availableQuantity: v.stock_quantity - v.reserved_quantity,
    lowStockThreshold: v.low_stock_threshold,
    isActive: v.is_active,
  }));
}
