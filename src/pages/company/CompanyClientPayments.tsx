import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Loader2, Banknote, CheckCircle2, AlertTriangle, PackageCheck, History, Undo2, Download } from "lucide-react";
import { useCompanyClients } from "@/context/CompanyClientContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { companyPayoutsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { computePayout } from "@/lib/payout";
import { formatAmount, formatDateTime, downloadBlob } from "@/lib/utils";
import { PdfIconButton } from "@/components/company/PdfIconButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ClientPayout, ClientPayoutPreview, clientFullName } from "@/types";

function payoutErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

export default function CompanyClientPayments() {
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
  const [downloading, setDownloading] = useState(false);

  // The backend only returns delivered packages now; ignore any legacy "returned" line defensively.
  const lines = useMemo(() => (preview ? preview.lines.filter((l) => l.kind !== "returned") : []), [preview]);
  const totals = useMemo(() => computePayout(lines), [lines]);

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
    if (!preview || lines.length === 0) return;
    setValidating(true);
    try {
      // Send the exact packages shown on screen: the backend marks these — and
      // only these — as settled, and rejects any that were settled meanwhile.
      const payout = await companyPayoutsApi.validate(
        preview.client.id,
        lines.map((l) => l.deliveryId)
      );
      setReceipt(payout);
      showToast("Versement validé", "success");
      refreshDeliveries();
      await loadClient(preview.client.id, true);
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      showToast(
        conflict ? "Certains colis ont déjà été réglés. La liste a été actualisée." : payoutErrorMessage(err),
        "warning"
      );
      if (conflict) await loadClient(preview.client.id, true);
    } finally {
      setValidating(false);
      setConfirming(false);
    }
  }

  async function handleDownload() {
    if (!preview || lines.length === 0) return;
    setDownloading(true);
    try {
      const blob = await companyPayoutsApi.downloadPdf(
        preview.client.id,
        lines.map((l) => l.deliveryId)
      );
      downloadBlob(blob, `releve-paiement-${preview.client.id}.pdf`);
    } catch (err) {
      showToast(payoutErrorMessage(err), "warning");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Paiement des clients</h1>
      <p className="mt-1 text-ink-500">
        Saisissez l'ID d'un client : le système calcule le montant à lui verser pour ses colis livrés. Les colis annulés
        se gèrent dans{" "}
        <Link to="/company/client-returns" className="font-semibold text-brand-600 hover:text-brand-700">
          Retours clients
        </Link>
        .
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
            au client ({receipt.deliveredCount} colis livré(s)). Ces colis ne pourront plus être payés une seconde fois.
          </p>
          <PdfIconButton
            className="ml-auto"
            label="Télécharger le reçu (PDF)"
            filename={`recu-paiement-${receipt.id}.pdf`}
            getPdf={() => companyPayoutsApi.downloadReceiptPdf(receipt.id)}
          />
        </div>
      )}

      {preview && (
        <div className="mt-6 space-y-4">
          {/* Client */}
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">{clientFullName(preview.client)}</p>
              <p className="text-sm text-ink-500">
                {preview.client.id} · {preview.client.phone}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <Link
                to={`/company/client-returns?clientId=${encodeURIComponent(preview.client.id)}`}
                className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700"
              >
                <Undo2 className="h-3.5 w-3.5" /> Retours de ce client
              </Link>
              <Link
                to={`/company/clients/${encodeURIComponent(preview.client.id)}`}
                className="text-brand-600 hover:text-brand-700"
              >
                Voir la fiche client
              </Link>
            </div>
          </div>

          {/* Packages being paid */}
          {lines.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-go-50 text-go-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold text-ink-900">Rien à payer</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">
                Tous les colis livrés de ce client ont déjà été réglés.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
              <div className="border-b border-ink-100 bg-ink-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {lines.length} colis livré(s) à payer
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Colis</th>
                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {lines.map((l) => (
                    <tr key={l.deliveryId}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/company/deliveries/${encodeURIComponent(l.deliveryId)}`}
                          className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:text-brand-600"
                        >
                          <PackageCheck className="h-3.5 w-3.5 text-go-600" />
                          {l.deliveryId}
                        </Link>
                        <p className="text-xs text-ink-500">{l.recipientName}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDateTime(l.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-go-600">
                        {formatAmount(l.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Total + validate */}
          {lines.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-600">{totals.deliveredCount} colis livré(s)</dt>
                  <dd className="font-semibold tabular-nums text-ink-900">{formatAmount(totals.total)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                  <dt className="font-display font-semibold text-ink-900">Net à payer au client</dt>
                  <dd className="font-display text-2xl font-bold tabular-nums text-ink-950">
                    {formatAmount(totals.total)}
                  </dd>
                </div>
              </dl>

              <Button variant="outline" fullWidth className="mt-5" disabled={downloading} onClick={handleDownload}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger le relevé PDF
              </Button>

              <div className="mt-3">
                {confirming ? (
                  <div className="rounded-xl bg-ink-50 p-4">
                    <p className="text-sm text-ink-700">
                      Confirmer le versement de <strong>{formatAmount(totals.total)}</strong> ? Les{" "}
                      <strong>{lines.length} colis</strong> ci-dessus seront marqués comme payés et ne pourront plus
                      être payés à nouveau.
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
                  <Button size="lg" fullWidth onClick={() => setConfirming(true)}>
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
                        {formatDateTime(p.createdAt)} · {p.deliveredCount} colis livré(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="font-semibold tabular-nums text-go-600">{formatAmount(p.netAmount ?? p.grossAmount)}</p>
                    {
                      /**  <PdfIconButton
                        label={`Télécharger le reçu ${p.id} (PDF)`}
                        filename={`recu-paiement-${p.id}.pdf`}
                        getPdf={() => companyPayoutsApi.downloadReceiptPdf(p.id)}
                      /> */
                    }
                    </div>
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
