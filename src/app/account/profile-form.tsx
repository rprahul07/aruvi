"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { profileSchema } from "@/lib/validators/account";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";

export function ProfileForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);

    const parsed = profileSchema.safeParse({ fullName, phone });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    const res = await fetch("/api/v1/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setIsSubmitting(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm" noValidate>
      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
        <FieldError>{errors.fullName}</FieldError>
      </div>
      <div className="mt-4">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />
        <FieldError>{errors.phone}</FieldError>
      </div>
      {saved ? <p className="mt-3 text-sm text-success">Saved</p> : null}
      <Button type="submit" size="md" className="mt-5" isLoading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}
