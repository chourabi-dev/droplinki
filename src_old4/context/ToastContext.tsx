import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-go-500 shrink-0" />,
  info: <Info className="h-5 w-5 text-brand-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-warn-500 shrink-0" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:right-6 sm:inset-x-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-rise-in flex w-full max-w-sm items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card"
            )}
            role="status"
          >
            {ICONS[t.kind]}
            <p className="flex-1 text-sm font-medium text-ink-900">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded-full p-1 text-ink-500 hover:bg-ink-50"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
