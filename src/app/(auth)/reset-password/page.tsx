"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { BRAND } from "@/lib/constants/brand";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/account"), 1500);
  }

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs uppercase tracking-[0.28em] text-gold">{BRAND.name}</p>
        <h1 className="mt-2 text-center font-display text-3xl text-ink">Set a new password</h1>

        {done ? (
          <p className="mt-6 text-center text-sm text-success">Password updated — redirecting…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8" noValidate>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error ?? undefined}
            />
            <FieldError>{error ?? undefined}</FieldError>

            <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" isLoading={isSubmitting}>
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
