"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS } from "@/lib/constants/order-status";
import type { OrderStatus } from "@/types/domain";

export function OrderStatusUpdater({
  orderId,
  nextOptions,
}: {
  orderId: string;
  nextOptions: OrderStatus[];
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<OrderStatus | "">("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  if (nextOptions.length === 0) {
    return <p className="text-sm text-muted">No further status transitions available.</p>;
  }

  async function handleUpdate() {
    if (!selected) return;
    setError(null);
    setIsSaving(true);

    const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: selected, note: note || undefined }),
    });
    const json = await res.json();
    setIsSaving(false);

    if (!json.success) {
      setError(json.error?.message ?? "Update failed");
      return;
    }

    setSelected("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value as OrderStatus)}
        className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
      >
        <option value="">Move to…</option>
        {nextOptions.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button variant="gold" className="w-full" onClick={handleUpdate} disabled={!selected} isLoading={isSaving}>
        Update status
      </Button>
    </div>
  );
}
