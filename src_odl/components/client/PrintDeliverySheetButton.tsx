import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { clientDeliveriesApi } from "@/lib/clientApi";
import { ApiError } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { downloadBlob, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface PrintDeliverySheetButtonProps {
  deliveryId: string;
  /** "icon" for tight spaces like a list row, "full" for a labeled button (e.g. the details page). */
  variant?: "icon" | "full";
  className?: string;
}

/**
 * Downloads the printable delivery sheet (PDF) for a client (Expéditeur)
 * delivery via GET /api/client/deliveries/{id}/pdf and saves it to disk.
 * Used both in the deliveries list (icon button per row) and on the delivery
 * details page (full labeled button).
 */
export function PrintDeliverySheetButton({ deliveryId, variant = "full", className }: PrintDeliverySheetButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handlePrint(e?: React.SyntheticEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const blob = await clientDeliveriesApi.downloadPdf(deliveryId);
      downloadBlob(blob, `bon-livraison-${deliveryId}.pdf`);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Impossible de télécharger le bon de livraison.",
        "warning"
      );
    } finally {
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handlePrint}
        disabled={loading}
        title="Imprimer le bon de livraison"
        aria-label="Imprimer le bon de livraison"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60",
          className
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading} className={className}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      Imprimer le bon de livraison
    </Button>
  );
}
