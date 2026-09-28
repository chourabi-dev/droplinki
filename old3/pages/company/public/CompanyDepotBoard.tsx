import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Truck, RotateCcw } from "lucide-react";
import { companyWarehousePublicApi } from "@/lib/companyApi";
import { ApiError, isNetworkError } from "@/lib/api";
import { CompanyDelivery } from "@/types";
import { WarehouseBoardLayout } from "@/components/company/public/WarehouseBoardLayout";
import { WarehousePackageCard } from "@/components/company/public/WarehousePackageCard";
import { useToast } from "@/context/ToastContext";

function warehouseErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

/**
 * No-auth board — mounted outside CompanyLayout/CompanyAuthProvider in
 * App.tsx (only the app-wide ToastProvider wraps it, for the inline
 * success/error toasts on each action below).
 */
export default function CompanyDepotBoard() {
  const { companyId } = useParams<{ companyId: string }>();
  const { showToast } = useToast();

  const [deliveries, setDeliveries] = useState<CompanyDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await companyWarehousePublicApi.listIncoming(companyId);
      setDeliveries(data);
    } catch (err) {
      setError(warehouseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function withPending(id: string, fn: () => Promise<void>) {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } catch (err) {
      showToast(warehouseErrorMessage(err), "warning");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function moveToLoading(d: CompanyDelivery) {
    if (!companyId) return;
    await withPending(d.id, async () => {
      await companyWarehousePublicApi.moveToLoading(companyId, d.id);
      setDeliveries((prev) => prev.filter((x) => x.id !== d.id));
      showToast(`${d.id} envoyé au chargement`, "success");
    });
  }

  async function markReturned(d: CompanyDelivery) {
    if (!companyId) return;
    const reason = window.prompt("Motif du retour (optionnel) :") || undefined;
    await withPending(d.id, async () => {
      await companyWarehousePublicApi.markReturned(companyId, d.id, reason);
      setDeliveries((prev) => prev.filter((x) => x.id !== d.id));
      showToast(`${d.id} marqué en retour`, "success");
    });
  }

  return (
    <WarehouseBoardLayout
      companyId={companyId || ""}
      activeTab="depot"
      title="Colis en dépôt"
      subtitle="Colis arrivés au dépôt, en attente d'être chargés."
      count={deliveries.length}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      isEmpty={deliveries.length === 0}
      emptyLabel="Aucun colis en dépôt pour le moment."
    >
      <div className="space-y-3">
        {deliveries.map((d) => (
          <WarehousePackageCard
            key={d.id}
            delivery={d}
            actions={
              <>
                <button
                  disabled={pendingIds.has(d.id)}
                  onClick={() => markReturned(d)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Retour
                </button>
                <button
                  disabled={pendingIds.has(d.id)}
                  onClick={() => moveToLoading(d)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" /> Charger dans le camion
                </button>
              </>
            }
          />
        ))}
      </div>
    </WarehouseBoardLayout>
  );
}
