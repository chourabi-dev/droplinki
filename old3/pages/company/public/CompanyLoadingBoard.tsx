import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Undo2 } from "lucide-react";
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
export default function CompanyLoadingBoard() {
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
      const data = await companyWarehousePublicApi.listLoading(companyId);
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

  async function confirmLoaded(d: CompanyDelivery) {
    if (!companyId) return;
    await withPending(d.id, async () => {
      await companyWarehousePublicApi.confirmLoaded(companyId, d.id);
      setDeliveries((prev) => prev.filter((x) => x.id !== d.id));
      showToast(`${d.id} confirmé chargé sur le camion`, "success");
    });
  }

  async function sendBackToDepot(d: CompanyDelivery) {
    if (!companyId) return;
    await withPending(d.id, async () => {
      await companyWarehousePublicApi.moveToDepot(companyId, d.id);
      setDeliveries((prev) => prev.filter((x) => x.id !== d.id));
      showToast(`${d.id} remis au dépôt`, "success");
    });
  }

  return (
    <WarehouseBoardLayout
      companyId={companyId || ""}
      activeTab="chargement"
      title="Chargement du camion"
      subtitle="Colis actuellement en cours de chargement."
      count={deliveries.length}
      isLoading={isLoading}
      error={error}
      onRetry={load}
      isEmpty={deliveries.length === 0}
      emptyLabel="Aucun colis en cours de chargement."
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
                  onClick={() => sendBackToDepot(d)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" /> Remettre au dépôt
                </button>
                <button
                  disabled={pendingIds.has(d.id)}
                  onClick={() => confirmLoaded(d)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-go-500 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-go-600 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Confirmer le chargement
                </button>
              </>
            }
          />
        ))}
      </div>
    </WarehouseBoardLayout>
  );
}
