import { createAdminClient } from "@/lib/supabase/admin";
import { CategoryManager, type AdminCategory } from "@/components/admin/category-manager";

export const metadata = { title: "Categories · Admin" };

export default async function AdminCategoriesPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("categories")
    .select("id, name, slug, description, sort_order, is_active")
    .order("sort_order");

  const categories: AdminCategory[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    sortOrder: c.sort_order,
    isActive: c.is_active,
  }));

  return <CategoryManager initialCategories={categories} />;
}
