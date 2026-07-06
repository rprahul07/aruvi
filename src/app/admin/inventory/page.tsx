import { listAdminVariants } from "@/lib/data/admin-products";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata = { title: "Inventory · Admin" };

export default async function AdminInventoryPage() {
  const variants = await listAdminVariants();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Inventory</h1>
      <p className="mt-1 text-sm text-muted">Adjust stock levels. Reserved units are held by in-progress checkouts.</p>
      <div className="mt-6">
        <InventoryTable variants={variants} />
      </div>
    </div>
  );
}
