import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Loader2,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Undo2,
  PackageCheck,
  History,
  ShieldAlert,
} from "lucide-react";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import { useCompanyClients } from "@/context/CompanyClientContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { companyPayoutsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { computePayout } from "@/lib/payout";
import { formatAmount, formatDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClientPayout, ClientPayoutPreview, clientFullName } from "@/types";

function payoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

/** Signed DT amount, e.g. "+30 DT" / "−3 DT". */
function signed(n: number): string {
  if (n === 0) return formatAmount(0);
  return `${n > 0 ? "+" : "−"}${formatAmount(Math.abs(n))}`;
}

export default function CompanyClientPayments() {
  const { company } = useCompanyAuth();
  const { clients } = useCompanyClients();
  const { refresh: refreshDeliveries } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clientIdInput, setClientIdInput] = useState(searchParams.get("clientId") || "");
  const [preview, setPreview] = useState<ClientPayoutPreview | null>(null);
  const [history, setHistory] = useState<ClientPayout[]>([]);
  const [receipt, setReceipt] = useState<ClientPayout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [validating, setValidating] = useState(false);

  // Return fees come from the company info; the preview may carry its own copy.
  const returnFee = preview?.returnFee ?? company?.returnFees;
  const returnFeeKnown = returnFee !== undefined && returnFee !== null && !Number.isNaN(Number(returnFee));

  const totals = useMemo(
    () => (preview ? computePayout(preview.lines, Number(returnFee) || 0) : null),
    [preview, returnFee]
  );

  const loadClient = useCallback(
    async (rawId: string, keepReceipt = false) => {
      const clientId = rawId.trim();
      if (!clientId) return;
      setLoading(true);
      setError(null);
      setConfirming(false);
      if (!keepReceipt) setReceipt(null);
      try {
        const [p, h] = await Promise.all([
          companyPayoutsApi.preview(clientId),
          companyPayoutsApi.history(clientId).catch(() => [] as ClientPayout[]),
        ]);
        setPreview(p);
        setHistory(h);
        setSearchParams({ clientId }, { replace: true });
      } catch (err) {
        setPreview(null);
        setHistory([]);
        setError(
          err instanceof ApiError && err.status === 404
            ? `Aucun client trouvé avec l'ID « ${clientId} ».`
            : payoutErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    },
    [setSearchParams]
  );

  // Deep link from a client page: /company/payments?clientId=...
  useEffect(() => {
    const initial = searchParams.get("clientId");
    if (initial) loadClient(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleValidate() {
    if (!preview || !totals || preview.lines.length === 0) return;
    setValidating(true);
    try {
      // Send the exact packages shown on screen: the backend marks these — and
      // only these — as settled, and rejects any that were settled meanwhile.
      const payout = await companyPayoutsApi.validate(
        preview.client.id,
        preview.lines.map((l) => l.deliveryId)
      );
      setReceipt(payout);
      showToast("Versement validé", "success");
      refreshDeliveries();
      await loadClient(preview.client.id, true);
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      showToast(
        conflict
          ? "Certains colis ont déjà été réglés. La liste a été actualisée."
          : payoutErrorMessage(err),
        "warning"
      );
      if (conflict) await loadClient(preview.client.id, true);
    } finally {
      setValidating(false);
      setConfirming(false);
    }
  }

  const canValidate =
    !!preview && !!totals && preview.lines.length > 0 && (totals.returnedCount === 0 || returnFeeKnown);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Paiement des clients</h1>
      <p className="mt-1 text-ink-500">
        Saisissez l'ID d'un client : le système calcule le montant à lui verser (colis livrés) moins les frais de
        retour des colis annulés.
      </p>

      {/* Client id lookup */}
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          loadClient(clientIdInput);
        }}
      >
        <div className="flex-1">
          <Input
            label="ID du client"
            placeholder="Ex. CL-1042"
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            list="payout-client-ids"
            autoFocus
          />
          <datalist id="payout-client-ids">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientFullName(c)}
              </option>
            ))}
          </datalist>
        </div>
        <Button type="submit" disabled={loading || !clientIdInput.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Calculer
        </Button>
      </form>

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
            Versement <strong>{receipt.id}</strong> validé : <strong>{formatAmount(receipt.netAmount)}</strong> à remettre
            au client ({receipt.deliveredCount} livré(s), {receipt.returnedCount} retour(s)). Ces colis ne pourront plus
            être payés une seconde fois.
          </p>
        </div>
      )}

      {preview && totals && (
        <div className="mt-6 space-y-4">
          {/* Client */}
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">
                {clientFullName(preview.client)}
              </p>
              <p className="text-sm text-ink-500">
                {preview.client.id} · {preview.client.phone}
              </p>
            </div>
            <Link
              to={`/company/clients/${encodeURIComponent(preview.client.id)}`}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir la fiche client
            </Link>
          </div>

          {!returnFeeKnown && totals.returnedCount > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-4 text-sm text-warn-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Les frais de retour ne sont pas définis dans les informations de l'entreprise. Le versement ne peut pas
                être validé tant qu'ils ne sont pas renseignés.
              </p>
            </div>
          )}

          {/* Packages being treated */}
          {preview.lines.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-go-50 text-go-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold text-ink-900">Rien à payer</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">
                Tous les colis livrés ou annulés de ce client ont déjà été réglés.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
              <div className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {preview.lines.length} colis à traiter
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Colis</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Date</th>
                    <th className="px-4 py-3 font-semibold">Résultat</th>
                    <th className="px-4 py-3 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {preview.lines.map((l) => {
                    const delivered = l.kind === "delivered";
                    return (
                      <tr key={l.deliveryId}>
                        <td className="px-4 py-3">
                          <Link
                            to={`/company/deliveries/${encodeURIComponent(l.deliveryId)}`}
                            className="font-medium text-ink-900 hover:text-brand-600"
                          >
                            {l.deliveryId}
                          </Link>
                          <p className="text-xs text-ink-500">{l.recipientName}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDateTime(l.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                              delivered ? "bg-go-50 text-go-600" : "bg-red-50 text-red-600"
                            )}
                          >
                            {delivered ? <PackageCheck className="h-3 w-3" /> : <Undo2 className="h-3 w-3" />}
                            {delivered ? "Livré" : "Retourné"}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-semibold tabular-nums",
                            delivered ? "text-go-600" : "text-red-600"
                          )}
                        >
                          {delivered ? signed(l.amount || 0) : signed(-(Number(returnFee) || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals + validate */}
          {preview.lines.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-600">
                    {totals.deliveredCount} colis livré(s)
                  </dt>
                  <dd className="font-semibold tabular-nums text-go-600">{signed(totals.gross)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-600">
                    {totals.returnedCount} colis retourné(s) × frais de retour{" "}
                    {returnFeeKnown ? formatAmount(Number(returnFee)) : "?"}
                  </dt>
                  <dd className="font-semibold tabular-nums text-red-600">{signed(-totals.returnFeesTotal)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                  <dt className="font-display font-semibold text-ink-900">
                    {totals.net < 0 ? "Dû par le client" : "Net à payer au client"}
                  </dt>
                  <dd className="font-display text-2xl font-bold tabular-nums text-ink-950">
                    {formatAmount(Math.abs(totals.net))}
                  </dd>
                </div>
              </dl>

              {totals.net < 0 && (
                <p className="mt-3 text-xs text-ink-500">
                  Les frais de retour dépassent les montants encaissés : aucun versement n'est dû, le solde négatif est
                  simplement enregistré.
                </p>
              )}

              <div className="mt-5">
                {confirming ? (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <p className="text-sm text-ink-700">
                      Confirmer le versement de <strong>{formatAmount(totals.net)}</strong> ? Les{" "}
                      <strong>{preview.lines.length} colis</strong> ci-dessus seront marqués comme traités et ne
                      pourront plus être payés à nouveau.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="success" fullWidth disabled={validating} onClick={handleValidate}>
                        {validating ? "Validation..." : "Oui, valider le versement"}
                      </Button>
                      <Button variant="ghost" disabled={validating} onClick={() => setConfirming(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" fullWidth disabled={!canValidate} onClick={() => setConfirming(true)}>
                    <Banknote className="h-4.5 w-4.5" /> Valider le versement
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
                <History className="h-4 w-4 text-ink-400" /> Versements précédents
              </h2>
              <ul className="divide-y divide-ink-100 text-sm">
                {history.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="font-medium text-ink-900">{p.id}</p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(p.createdAt)} · {p.deliveredCount} livré(s), {p.returnedCount} retour(s)
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums text-ink-900">{formatAmount(p.netAmount)}</p>
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
