"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { productUpsertSchema, type ProductUpsertInput } from "@/lib/validators/admin-product";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import type { AdminProductDetail } from "@/lib/data/admin-products";

interface CategoryOption {
  id: string;
  name: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  initial,
  categories,
}: {
  initial?: AdminProductDetail;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const isEdit = !!initial;

  const [values, setValues] = React.useState<ProductUpsertInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    sku: initial?.sku ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? null,
    material: initial?.material ?? "",
    metal: initial?.metal ?? "",
    occasion: initial?.occasion ?? "",
    style: initial?.style ?? "",
    basePrice: initial?.basePrice ?? 0,
    salePrice: initial?.salePrice ?? null,
    taxPercent: initial?.taxPercent ?? 3,
    status: (initial?.status as ProductUpsertInput["status"]) ?? "draft",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(isEdit);

  function set<K extends keyof ProductUpsertInput>(key: K, value: ProductUpsertInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = productUpsertSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    const url = isEdit ? `/api/v1/admin/products/${initial!.id}` : "/api/v1/admin/products";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const json = await res.json();
    setIsSubmitting(false);

    if (!json.success) {
      setFormError(json.error?.message ?? "Couldn't save the product");
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => {
            set("name", e.target.value);
            if (!slugTouched) set("slug", slugify(e.target.value));
          }}
          error={errors.name}
        />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
          error={errors.slug}
        />
        <FieldError>{errors.slug}</FieldError>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" value={values.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={values.categoryId ?? ""}
            onChange={(e) => set("categoryId", e.target.value || null)}
            className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="shortDescription">Short description</Label>
        <Input
          id="shortDescription"
          value={values.shortDescription ?? ""}
          onChange={(e) => set("shortDescription", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={4}
          value={values.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          className="w-full rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="material">Material</Label>
          <Input id="material" value={values.material ?? ""} onChange={(e) => set("material", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="metal">Metal</Label>
          <Input id="metal" value={values.metal ?? ""} onChange={(e) => set("metal", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="occasion">Occasion</Label>
          <Input id="occasion" value={values.occasion ?? ""} onChange={(e) => set("occasion", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="style">Style</Label>
          <Input id="style" value={values.style ?? ""} onChange={(e) => set("style", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="basePrice">Base price (₹)</Label>
          <Input
            id="basePrice"
            type="number"
            min={0}
            value={values.basePrice}
            onChange={(e) => set("basePrice", Number(e.target.value))}
            error={errors.basePrice}
          />
          <FieldError>{errors.basePrice}</FieldError>
        </div>
        <div>
          <Label htmlFor="salePrice">Sale price (₹)</Label>
          <Input
            id="salePrice"
            type="number"
            min={0}
            value={values.salePrice ?? ""}
            onChange={(e) => set("salePrice", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <Label htmlFor="taxPercent">Tax %</Label>
          <Input
            id="taxPercent"
            type="number"
            min={0}
            value={values.taxPercent}
            onChange={(e) => set("taxPercent", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          value={values.status}
          onChange={(e) => set("status", e.target.value as ProductUpsertInput["status"])}
          className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="gold" isLoading={isSubmitting}>
          {isEdit ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
