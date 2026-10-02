import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { downloadBlob, cn } from "@/lib/utils";

interface PdfIconButtonProps {
  /** Fetches the PDF. */
  getPdf: () => Promise<Blob>;
  filename: string;
  label?: string;
  className?: string;
}

/** Small icon button that downloads a backend-generated PDF (used in history rows). */
export function PdfIconButton({ getPdf, filename, label = "Télécharger le PDF", className }: PdfIconButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      downloadBlob(await getPdf(), filename);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Impossible de télécharger le PDF.", "warning");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60",
        className
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}
