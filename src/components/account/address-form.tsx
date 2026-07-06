"use client";

import * as React from "react";
import { addressSchema, type AddressInput } from "@/lib/validators/account";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import type { Address } from "@/types/domain";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi",
];

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save address",
}: {
  initial?: Partial<Address>;
  onSubmit: (input: AddressInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [values, setValues] = React.useState<AddressInput>({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    alternatePhone: initial?.alternatePhone ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    landmark: initial?.landmark ?? "",
    city: initial?.city ?? "",
    district: initial?.district ?? "",
    state: initial?.state ?? "",
    postalCode: initial?.postalCode ?? "",
    addressType: initial?.addressType ?? "home",
    isDefault: initial?.isDefault ?? false,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} error={errors.fullName} />
          <FieldError>{errors.fullName}</FieldError>
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
          <FieldError>{errors.phone}</FieldError>
        </div>
        <div>
          <Label htmlFor="alternatePhone">Alternate phone (optional)</Label>
          <Input
            id="alternatePhone"
            type="tel"
            value={values.alternatePhone}
            onChange={(e) => set("alternatePhone", e.target.value)}
            error={errors.alternatePhone}
          />
          <FieldError>{errors.alternatePhone}</FieldError>
        </div>
        <div className="col-span-2">
          <Label htmlFor="line1">Address line 1</Label>
          <Input id="line1" value={values.line1} onChange={(e) => set("line1", e.target.value)} error={errors.line1} />
          <FieldError>{errors.line1}</FieldError>
        </div>
        <div className="col-span-2">
          <Label htmlFor="line2">Address line 2 (optional)</Label>
          <Input id="line2" value={values.line2} onChange={(e) => set("line2", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="landmark">Landmark (optional)</Label>
          <Input id="landmark" value={values.landmark} onChange={(e) => set("landmark", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={values.city} onChange={(e) => set("city", e.target.value)} error={errors.city} />
          <FieldError>{errors.city}</FieldError>
        </div>
        <div>
          <Label htmlFor="postalCode">PIN code</Label>
          <Input
            id="postalCode"
            inputMode="numeric"
            value={values.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            error={errors.postalCode}
          />
          <FieldError>{errors.postalCode}</FieldError>
        </div>
        <div className="col-span-2">
          <Label htmlFor="state">State</Label>
          <select
            id="state"
            value={values.state}
            onChange={(e) => set("state", e.target.value)}
            className="min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <FieldError>{errors.state}</FieldError>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Set as default address
      </label>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="gold" isLoading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
