import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function BottomSheet({ open, onClose, title, subtitle, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink-950/50" onClick={onClose} aria-label="Fermer" tabIndex={-1} />
      <div
        className={cn(
          "animate-rise-in relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-lift sm:max-w-md sm:rounded-3xl",
          "pb-[env(safe-area-inset-bottom)]",
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold text-ink-950">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-ink-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ink-500 hover:bg-ink-50" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
