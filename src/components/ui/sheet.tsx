"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Built on the native <dialog> element: showModal() gives us focus
 * trapping, Escape-to-close, and a backdrop for free — no extra
 * dependency for something this load-bearing across the mobile UI
 * (cart drawer, filter drawer, sort sheet all reuse this).
 */
export function Sheet({ open, onClose, side = "bottom", title, children, className }: SheetProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const handleClose = () => onClose();
    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      aria-label={title}
      className={cn(
        "z-modal m-0 max-h-none max-w-none border-none bg-transparent p-0 backdrop:bg-ink/40 open:animate-none",
        side === "bottom" ? "inset-x-0 bottom-0 top-auto w-full" : "inset-y-0 right-0 left-auto h-full",
      )}
    >
      <div
        className={cn(
          "flex max-h-[85vh] flex-col bg-surface shadow-lift",
          side === "bottom"
            ? "w-full rounded-t-xl pb-safe"
            : "h-full w-[min(420px,100vw)]",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
