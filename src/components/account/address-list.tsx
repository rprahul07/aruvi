"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Address } from "@/types/domain";
import type { AddressInput } from "@/lib/validators/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressForm } from "@/components/account/address-form";

export function AddressList({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = React.useState(initialAddresses);
  const [sheetMode, setSheetMode] = React.useState<null | "create" | string>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/v1/addresses");
    const json = await res.json();
    if (json.success) setAddresses(json.data);
  }

  async function handleCreate(input: AddressInput) {
    await fetch("/api/v1/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setSheetMode(null);
    await refresh();
  }

  async function handleUpdate(addressId: string, input: AddressInput) {
    await fetch(`/api/v1/addresses/${addressId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    setSheetMode(null);
    await refresh();
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    await fetch(`/api/v1/addresses/${addressId}`, { method: "DELETE" });
    setDeletingId(null);
    await refresh();
  }

  const editingAddress = typeof sheetMode === "string" ? addresses.find((a) => a.id === sheetMode) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Addresses</h1>
        <Button size="sm" onClick={() => setSheetMode("create")}>
          <Plus className="h-4 w-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No saved addresses" description="Add an address to speed up checkout next time." />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{address.fullName}</p>
                  <p className="text-sm text-muted">{address.phone}</p>
                </div>
                <div className="flex gap-1">
                  {address.isDefault ? <Badge variant="gold">Default</Badge> : null}
                </div>
              </div>
              <p className="mt-2 text-sm text-ink/80">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.postalCode}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSheetMode(address.id)}
                  className="flex items-center gap-1 text-xs font-medium text-ink hover:underline"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(address.id)}
                  disabled={deletingId === address.id}
                  className="flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={sheetMode !== null}
        onClose={() => setSheetMode(null)}
        side="right"
        title={sheetMode === "create" ? "Add address" : "Edit address"}
      >
        <AddressForm
          initial={editingAddress}
          onCancel={() => setSheetMode(null)}
          onSubmit={(input) => (sheetMode === "create" ? handleCreate(input) : handleUpdate(sheetMode as string, input))}
        />
      </Sheet>
    </div>
  );
}
