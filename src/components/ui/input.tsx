import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "min-h-11 w-full rounded-md border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted",
          "focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep",
          error && "border-danger focus:border-danger focus:ring-danger",
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-danger">
      {children}
    </p>
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}
