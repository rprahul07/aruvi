"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function CategoryManager({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminCategory | "new" | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  function openCreate() {
    setEditing("new");
    setName("");
    setSlug("");
    setDescription("");
    setIsActive(true);
    setError(null);
  }

  function openEdit(category: AdminCategory) {
    setEditing(category);
    setName(category.name);
    setSlug(category.slug);
    setDescription(category.description ?? "");
    setIsActive(category.isActive);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const isNew = editing === "new";
    const url = isNew ? "/api/v1/admin/categories" : `/api/v1/admin/categories/${(editing as AdminCategory).id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description, isActive, sortOrder: 0 }),
    });
    const json = await res.json();
    setIsSaving(false);

    if (!json.success) {
      setError(json.error?.message ?? "Save failed");
      return;
    }

    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Categories</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> New category
        </Button>
      </div>

      <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
        {initialCategories.map((category) => (
          <li key={category.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-ink">{category.name}</p>
              <p className="font-mono text-xs text-muted">/{category.slug}</p>
            </div>
            <div className="flex items-center gap-3">
              {category.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Hidden</Badge>}
              <Button variant="outline" size="sm" onClick={() => openEdit(category)}>
                Edit
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        side="right"
        title={editing === "new" ? "New category" : "Edit category"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (editing === "new") setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label htmlFor="cat-slug">Slug</Label>
            <Input id="cat-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Input id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
            Active (visible on storefront)
          </label>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" variant="gold" className="w-full" isLoading={isSaving}>
            Save
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
