import { useState } from "react";
import { Sparkles, X, RotateCcw } from "lucide-react";
import { useDeliveries } from "@/context/DeliveryContext";
import { useToast } from "@/context/ToastContext";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { resetDemoData } = useDeliveries();
  const { showToast } = useToast();

  if (dismissed) return null;

  return (
    <div className="border-b border-brand-100 bg-brand-50/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-xs text-brand-700 sm:px-6">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        <p className="flex-1">
          <span className="font-semibold">Mode démo —</span> créez une livraison, puis ouvrez son lien client dans un
          autre onglet pour simuler le partage de position.
        </p>
        <button
          onClick={() => {
            resetDemoData();
            showToast("Données de démo réinitialisées", "info");
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold hover:bg-brand-100"
        >
          <RotateCcw className="h-3 w-3" /> Réinitialiser
        </button>
        <button onClick={() => setDismissed(true)} className="rounded-full p-1 hover:bg-brand-100" aria-label="Fermer">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
