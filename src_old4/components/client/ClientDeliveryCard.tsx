import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClientDelivery, clientDeliveryRecipientFullName } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { PrintDeliverySheetButton } from "@/components/client/PrintDeliverySheetButton";
import { useClientDeliveries, clientDeliveryErrorMessage } from "@/context/ClientDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { formatDateTime, formatAmount } from "@/lib/utils";
import { ChevronRight, MapPin, User, Link2, Trash2, Loader2 } from "lucide-react";

export function ClientDeliveryCard({ delivery }: { delivery: ClientDelivery }) {
  const navigate = useNavigate();
  const { removeDelivery } = useClientDeliveries();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // EN-ATT (waiting_location) is the only status a client can delete from —
  // once the link is opened or a position comes back, the delivery is
  // already in motion and must stay in the history.
  const canDelete = delivery.status === "EN-ATT";

  function goToDetails() {
    if (confirming) return;
    navigate(`/client/deliveries/${delivery.id}`);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      await removeDelivery(delivery.id);
      showToast("Livraison supprimée", "success");
    } catch (err) {
      showToast(clientDeliveryErrorMessage(err), "warning");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 sm:p-5">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
          Supprimer la livraison de {clientDeliveryRecipientFullName(delivery)} ({delivery.id}) ?
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Confirmer
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(false);
          }}
          disabled={deleting}
          className="shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    // A <div> (not a <button>) so the print button below can be a real nested
    // <button> — buttons can't legally nest inside buttons in HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetails();
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand-200 hover:shadow-lift sm:p-5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{clientDeliveryRecipientFullName(delivery)}</p>
          <span className="hidden shrink-0 text-xs text-ink-500 sm:inline">· {delivery.id}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span>{formatDateTime(delivery.createdAt)}</span>
          {delivery.amount !== undefined && <span>{formatAmount(delivery.amount)}</span>}
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{delivery.address}</span>
          </span>
          {delivery.hasValidationLink && (
            <span className="inline-flex items-center gap-1 text-brand-600">
              <Link2 className="h-3 w-3" /> Lien envoyé
            </span>
          )}
        </div>
        <div className="mt-2 sm:hidden">
          <StatusBadge status={delivery.status} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        
         <StatusBadge status={delivery.status} />

        <PrintDeliverySheetButton deliveryId={delivery.id} variant="icon" />
        {canDelete && (
          <button
            onClick={handleDelete}
            aria-label="Supprimer"
            className="rounded-xl p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
      <PrintDeliverySheetButton deliveryId={delivery.id} variant="icon" className="sm:hidden" />
      {canDelete && (
        <button
          onClick={handleDelete}
          aria-label="Supprimer"
          className="rounded-xl p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 sm:hidden"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 sm:hidden" />
    </div>
  );
}
