import { getAllCategories } from "@/lib/data/catalog";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New Product · Admin" };

export default async function NewProductPage() {
  const categories = await getAllCategories();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">New Product</h1>
      <div className="mt-6">
        <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
