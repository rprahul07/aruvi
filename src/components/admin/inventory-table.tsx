"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/utils";
import type { AdminVariantRow } from "@/lib/data/admin-products";

export function InventoryTable({ variants }: { variants: AdminVariantRow[] }) {
  const router = useRouter();
  const [adjusting, setAdjusting] = React.useState<AdminVariantRow | null>(null);
  const [change, setChange] = React.useState("");
  const [reason, setReason] = React.useState("restock");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = variants.filter(
    (v) =>
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.productName.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    const changeNum = Number(change);
    if (!changeNum) {
      setError("Enter a non-zero quantity change");
      return;
    }
    setError(null);
    setIsSaving(true);

    const res = await fetch(`/api/v1/admin/inventory/${adjusting.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeQuantity: changeNum, reason, note: note || undefined }),
    });
    const json = await res.json();
    setIsSaving(false);

    if (!json.success) {
      setError(json.error?.message ?? "Adjustment failed");
      return;
    }

    setAdjusting(null);
    setChange("");
    setNote("");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <Input placeholder="Search SKU or product…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink/[0.03] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((v) => {
              const isLow = v.availableQuantity > 0 && v.availableQuantity <= v.lowStockThreshold;
              const isOut = v.availableQuantity <= 0;
              return (
                <tr key={v.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-3">{v.productName}</td>
                  <td className="px-4 py-3">{formatMoney(v.price)}</td>
                  <td className="px-4 py-3">{v.stockQuantity}</td>
                  <td className="px-4 py-3 text-muted">{v.reservedQuantity}</td>
                  <td className="px-4 py-3">
                    {isOut ? (
                      <Badge variant="danger">Out</Badge>
                    ) : isLow ? (
                      <Badge variant="warning">{v.availableQuantity} low</Badge>
                    ) : (
                      v.availableQuantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setAdjusting(v)}>
                      Adjust
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={adjusting !== null} onClose={() => setAdjusting(null)} side="right" title="Adjust stock">
        {adjusting ? (
          <form onSubmit={handleAdjust} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-ink">{adjusting.productName}</p>
              <p className="font-mono text-xs text-muted">{adjusting.sku}</p>
              <p className="mt-1 text-sm text-muted">
                Current stock: {adjusting.stockQuantity} (reserved {adjusting.reservedQuantity})
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="change">
                Quantity change (use negative to remove)
              </label>
              <Input
                id="change"
                type="number"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                placeholder="e.g. 10 or -2"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="reason">
                Reason
              </label>
              <select
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
              >
                <option value="restock">Restock</option>
                <option value="manual_adjustment">Manual adjustment</option>
                <option value="return">Return</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="note">
                Note (optional)
              </label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <Button type="submit" variant="gold" className="w-full" isLoading={isSaving}>
              Apply adjustment
            </Button>
          </form>
        ) : null}
      </Sheet>
    </div>
  );
}
