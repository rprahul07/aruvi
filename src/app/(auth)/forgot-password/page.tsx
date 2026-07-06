"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { BRAND } from "@/lib/constants/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-16 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl text-ink">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for {email}, we&apos;ve sent a link to reset your password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs uppercase tracking-[0.28em] text-gold">{BRAND.name}</p>
        <h1 className="mt-2 text-center font-display text-3xl text-ink">Reset your password</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8" noValidate>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error ?? undefined} />
          <FieldError>{error ?? undefined}</FieldError>

          <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" isLoading={isSubmitting}>
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-ink hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
