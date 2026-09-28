import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Undo2 } from "lucide-react";
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
 * App.tsx (only the app-wide ToastProvider wraps it).
 */
export default function CompanyReturnsBoard() {
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
      const data = await companyWarehousePublicApi.listReturns(companyId);
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

  async function backToDepot(d: CompanyDelivery) {
    if (!companyId) return;
    setPendingIds((prev) => new Set(prev).add(d.id));
    try {
      await companyWarehousePublicApi.moveToDepot(companyId, d.id);
      setDeliveries((prev) => prev.filter((x) => x.id !== d.id));
      showToast(`${d.id} remis en dépôt`, "success");
    } catch (err) {
      showToast(warehouseErrorMessage(err), "warning");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(d.id);
        return next;
      });
    }
  }

  return (
    <WarehouseBoardLayout
      companyId={companyId || ""}
      activeTab="retours"
      title="Retours"
      subtitle="Colis refusés ou non joignables, revenus au dépôt."
      count={deliveries.length}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      isEmpty={deliveries.length === 0}
      emptyLabel="Aucun retour pour le moment."
    >
      <div className="space-y-3">
        {deliveries.map((d) => (
          <WarehousePackageCard
            key={d.id}
            delivery={d}
            actions={
              <button
                disabled={pendingIds.has(d.id)}
                onClick={() => backToDepot(d)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                <Undo2 className="h-4 w-4" /> Remettre en dépôt
              </button>
            }
          />
        ))}
      </div>
    </WarehouseBoardLayout>
  );
}
