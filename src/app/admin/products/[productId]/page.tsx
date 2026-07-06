import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/data/admin-products";
import { getAllCategories } from "@/lib/data/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Edit Product · Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(productId), getAllCategories()]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Edit Product</h1>
      <div className="mt-6">
        <ProductForm initial={product} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
