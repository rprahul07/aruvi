import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminProducts } from "@/lib/data/admin-products";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Products · Admin" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
          <Plus className="h-4 w-4" /> New product
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink/[0.03] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-ink/[0.02]">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${product.id}`} className="font-medium text-ink hover:underline">
                    {product.name}
                  </Link>
                  <p className="text-xs text-muted">{product.variantCount} variant(s)</p>
                </td>
                <td className="px-4 py-3 text-muted">{product.categoryName ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.salePrice != null ? (
                    <span>
                      {formatMoney(product.salePrice)}{" "}
                      <span className="text-xs text-muted line-through">{formatMoney(product.basePrice)}</span>
                    </span>
                  ) : (
                    formatMoney(product.basePrice)
                  )}
                </td>
                <td className="px-4 py-3">{product.totalStock}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      product.status === "active" ? "success" : product.status === "draft" ? "warning" : "neutral"
                    }
                  >
                    {product.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
