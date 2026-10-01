import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Undo2,
  PackageCheck,
  History,
  Truck,
  RefreshCw,
} from "lucide-react";
import { useCompanyDrivers } from "@/context/CompanyDriverContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { companyDriverSettlementsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { computeSettlement, defaultOutcomes, lineTotal } from "@/lib/settlement";
import { formatAmount, formatDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  DriverSettlement,
  DriverSettlementPreview,
  SettlementOutcome,
  STATUS_LABELS,
  companyDriverFullName,
} from "@/types";

function settlementErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

/**
 * End-of-round closing of a delivery man. The driver comes back to the depot
 * with the cash of the successful deliveries and the packages that failed:
 * pick the driver, mark each package "Livré" / "Retour", check the cash total
 * and validate. Statuses are switched permanently server-side, which makes the
 * delivered packages payable to their clients (see CompanyClientPayments).
 */
export default function CompanyDriverSettlement() {
  const { drivers } = useCompanyDrivers();
  const { refresh: refreshDeliveries } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [driverId, setDriverId] = useState(searchParams.get("driverId") || "");
  const [preview, setPreview] = useState<DriverSettlementPreview | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, SettlementOutcome>>({});
  const [history, setHistory] = useState<DriverSettlement[]>([]);
  const [receipt, setReceipt] = useState<DriverSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [validating, setValidating] = useState(false);

  const totals = useMemo(
    () => (preview ? computeSettlement(preview.lines, outcomes) : null),
    [preview, outcomes]
  );

  const loadDriver = useCallback(
    async (rawId: string, keepReceipt = false) => {
      const id = rawId.trim();
      setConfirming(false);
      if (!keepReceipt) setReceipt(null);
      if (!id) {
        setPreview(null);
        setHistory([]);
        setError(null);
        setSearchParams({}, { replace: true });
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [p, h] = await Promise.all([
          companyDriverSettlementsApi.preview(id),
          companyDriverSettlementsApi.history(id).catch(() => [] as DriverSettlement[]),
        ]);
        setPreview(p);
        setOutcomes(defaultOutcomes(p.lines));
        setHistory(h);
        setSearchParams({ driverId: id }, { replace: true });
      } catch (err) {
        setPreview(null);
        setHistory([]);
        setError(
          err instanceof ApiError && err.status === 404
            ? "Livreur introuvable."
            : settlementErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    },
    [setSearchParams]
  );

  // Deep link from a driver page: /company/driver-settlement?driverId=...
  useEffect(() => {
    if (driverId) loadDriver(driverId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectDriver(id: string) {
    setDriverId(id);
    loadDriver(id);
  }

  function setOutcome(deliveryId: string, outcome: SettlementOutcome) {
    setConfirming(false);
    setOutcomes((prev) => ({ ...prev, [deliveryId]: outcome }));
  }

  function setAll(outcome: SettlementOutcome) {
    if (!preview) return;
    setConfirming(false);
    setOutcomes(Object.fromEntries(preview.lines.map((l) => [l.deliveryId, outcome])));
  }

  async function handleValidate() {
    if (!preview || !totals || preview.lines.length === 0) return;
    setValidating(true);
    try {
      // Send the exact packages shown on screen: the backend closes these — and
      // only these — and rejects any that were closed in the meantime.
      const deliveredIds = preview.lines.filter((l) => outcomes[l.deliveryId] === "delivered").map((l) => l.deliveryId);
      const returnedIds = preview.lines.filter((l) => outcomes[l.deliveryId] === "returned").map((l) => l.deliveryId);
      const settlement = await companyDriverSettlementsApi.validate(preview.driver.id, deliveredIds, returnedIds);
      setReceipt(settlement);
      showToast("Clôture validée", "success");
      refreshDeliveries();
      await loadDriver(preview.driver.id, true);
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      showToast(
        conflict
          ? "Certains colis ont déjà été clôturés. La liste a été actualisée."
          : settlementErrorMessage(err),
        "warning"
      );
      if (conflict) await loadDriver(preview.driver.id, true);
    } finally {
      setValidating(false);
      setConfirming(false);
    }
  }

  const canValidate = !!preview && !!totals && preview.lines.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Clôture livreur</h1>
      <p className="mt-1 text-ink-500">
        Sélectionnez le livreur à son retour au dépôt : indiquez quels colis sont livrés ou retournés, encaissez le
        montant total et validez pour clôturer sa tournée.
      </p>

      {/* Driver picker */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="settlement-driver" className="mb-1.5 block text-sm font-medium text-ink-700">
            Livreur
          </label>
          <select
            id="settlement-driver"
            value={driverId}
            onChange={(e) => handleSelectDriver(e.target.value)}
            className="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">— Choisir un livreur —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {companyDriverFullName(d)} · {d.phone}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading || !driverId}
          onClick={() => loadDriver(driverId)}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualiser
        </Button>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {receipt && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-go-500/20 bg-go-50 p-4 text-sm text-go-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Clôture <strong>{receipt.id}</strong> validée : <strong>{formatAmount(receipt.cashTotal)}</strong> encaissés
            ({receipt.deliveredCount} livré(s)), {receipt.returnedCount} colis retourné(s) au dépôt. Les colis livrés
            peuvent maintenant être payés à leurs clients.
          </p>
        </div>
      )}

      {loading && !preview && (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
        </div>
      )}

      {preview && totals && (
        <div className="mt-6 space-y-4">
          {/* Driver */}
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-ink-900">
                  {companyDriverFullName(preview.driver)}
                </p>
                <p className="text-sm text-ink-500">
                  {preview.driver.id} · {preview.driver.phone}
                </p>
              </div>
            </div>
            <Link
              to={`/company/drivers/${encodeURIComponent(preview.driver.id)}`}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir la fiche livreur
            </Link>
          </div>

          {preview.lines.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-go-50 text-go-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold text-ink-900">Rien à clôturer</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">
                Ce livreur n'a aucun colis en attente de clôture.
              </p>
            </div>
          ) : (
            <>
              {/* Packages */}
              <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
                <div className="flex flex-col gap-2 border-b border-ink-100 bg-ink-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {preview.lines.length} colis à clôturer
                  </span>
                  <div className="flex gap-3 text-xs font-semibold">
                   {
                    /** <button type="button" onClick={() => setAll("delivered")} className="text-go-600 hover:underline">
                      Tout livré
                    </button>
                    <button type="button" onClick={() => setAll("returned")} className="text-red-600 hover:underline">
                      Tout retourné
                    </button> */
                   }
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Colis</th> 
                        <th className="px-4 py-3 text-right font-semibold">Montant</th>
                        <th className="px-4 py-3 text-right font-semibold">Frais</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {preview.lines.map((l) => {
                        const delivered = outcomes[l.deliveryId] === "delivered";
                        return (
                          <tr key={l.deliveryId} className={cn(!delivered && "bg-red-50/40")}>
                            <td className="px-4 py-3">
                              <Link
                                to={`/company/deliveries/${encodeURIComponent(l.deliveryId)}`}
                                className="font-medium text-ink-900 hover:text-brand-600"
                              >
                                {l.deliveryId}
                              </Link>
                              <p className="text-xs text-ink-500">
                                {l.recipientName} · {STATUS_LABELS[l.status]}
                              </p>
                            </td>
                            {
                              /**<td className="px-4 py-3">
                              <div className="inline-flex rounded-xl border border-ink-200 bg-white p-0.5 text-xs font-semibold">
                                <button
                                  type="button"
                                  aria-pressed={delivered}
                                  onClick={() => setOutcome(l.deliveryId, "delivered")}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 transition-colors",
                                    delivered ? "bg-go-500 text-white" : "text-ink-500 hover:bg-ink-50"
                                  )}
                                >
                                  <PackageCheck className="h-3.5 w-3.5" /> Livré
                                </button>
                                <button
                                  type="button"
                                  aria-pressed={!delivered}
                                  onClick={() => setOutcome(l.deliveryId, "returned")}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 transition-colors",
                                    !delivered ? "bg-red-500 text-white" : "text-ink-500 hover:bg-ink-50"
                                  )}
                                >
                                  <Undo2 className="h-3.5 w-3.5" /> Retour
                                </button>
                              </div>
                            </td> */
                            }
                            <td className={cn("px-4 py-3 text-right tabular-nums", !delivered && "text-ink-300 line-through")}>
                              {formatAmount(l.amount || 0)}
                            </td>
                            <td className={cn("px-4 py-3 text-right tabular-nums", !delivered && "text-ink-300 line-through")}>
                              {formatAmount(l.deliveryFees || 0)}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-right font-semibold tabular-nums",
                                delivered ? "text-go-600" : "text-ink-300"
                              )}
                            >
                              {delivered ? formatAmount(lineTotal(l)) : formatAmount(0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals + validate */}
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-600">Montants des colis ({totals.deliveredCount} livré(s))</dt>
                    <dd className="font-semibold tabular-nums text-ink-900">{formatAmount(totals.amountTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">Frais de livraison</dt>
                    <dd className="font-semibold tabular-nums text-ink-900">{formatAmount(totals.feesTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-600">Colis retournés au dépôt</dt>
                    <dd className="font-semibold tabular-nums text-red-600">{totals.returnedCount}</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                    <dt className="font-display font-semibold text-ink-900">Total à encaisser du livreur</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-ink-950">
                      {formatAmount(totals.cashTotal)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  {confirming ? (
                    <div className="rounded-xl bg-ink-50 p-4">
                      <p className="text-sm text-ink-700">
                        Confirmer l'encaissement de <strong>{formatAmount(totals.cashTotal)}</strong> et la remise de{" "}
                        <strong>{totals.returnedCount} colis</strong> au dépôt ? Les{" "}
                        <strong>{preview.lines.length} colis</strong> ci-dessus seront clôturés définitivement :{" "}
                        {totals.deliveredCount} passeront en « Livrée » et {totals.returnedCount} en « En dépôt, échec
                        de livraison ». Cette action est irréversible.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button variant="success" fullWidth disabled={validating} onClick={handleValidate}>
                          {validating ? "Validation..." : "Oui, clôturer la tournée"}
                        </Button>
                        <Button variant="ghost" disabled={validating} onClick={() => setConfirming(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="lg" fullWidth disabled={!canValidate} onClick={() => setConfirming(true)}>
                      <Banknote className="h-4.5 w-4.5" /> Valider la clôture
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
                <History className="h-4 w-4 text-ink-400" /> Clôtures précédentes
              </h2>
              <ul className="divide-y divide-ink-100 text-sm">
                {history.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">{s.id}</p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(s.createdAt)} · {s.deliveredCount} livré(s), {s.returnedCount} retour(s)
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-green-500">{formatAmount(s.cashTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
