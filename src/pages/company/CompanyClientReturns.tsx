import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Download,
  History,
  ShieldAlert,
  PackageX,
  FileSignature,
} from "lucide-react";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import { useCompanyClients } from "@/context/CompanyClientContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { companyReturnsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { computeReturnFees } from "@/lib/returns";
import { formatAmount, formatDateTime, downloadBlob, printBlob, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PdfIconButton } from "@/components/company/PdfIconButton";
import { Input } from "@/components/ui/Input";
import { ClientReturn, ClientReturnPreview, clientFullName } from "@/types";

function returnsErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

/** A generated PDF, tied to the exact selection it was generated for. */
interface Slip {
  key: string;
  blob: Blob;
}

export default function CompanyClientReturns() {
  const { company } = useCompanyAuth();
  const { clients } = useCompanyClients();
  const { refresh: refreshDeliveries } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [clientIdInput, setClientIdInput] = useState(searchParams.get("clientId") || "");
  const [preview, setPreview] = useState<ClientReturnPreview | null>(null);
  const [history, setHistory] = useState<ClientReturn[]>([]);
  const [receipt, setReceipt] = useState<ClientReturn | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [slip, setSlip] = useState<Slip | null>(null);
  const [signedAndPaid, setSignedAndPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Return fees come from the backend preview, falling back to the company info.
  const returnFee = preview?.returnFee ?? company?.returnFees;
  const returnFeeKnown = returnFee !== undefined && returnFee !== null && !Number.isNaN(Number(returnFee));

  const lines = preview?.lines ?? [];
  const selectedIds = useMemo(() => lines.filter((l) => selected.has(l.deliveryId)).map((l) => l.deliveryId), [lines, selected]);
  const selectionKey = useMemo(() => [...selectedIds].sort().join("|"), [selectedIds]);
  const feesTotal = computeReturnFees(selectedIds.length, Number(returnFee) || 0);

  // The printed slip is only valid for the selection it was generated from.
  const slipReady = !!slip && slip.key === selectionKey;
  const allSelected = lines.length > 0 && selectedIds.length === lines.length;

  const loadClient = useCallback(
    async (rawId: string, keepReceipt = false) => {
      const clientId = rawId.trim();
      if (!clientId) return;
      setLoading(true);
      setError(null);
      setSlip(null);
      setSignedAndPaid(false);
      if (!keepReceipt) setReceipt(null);
      try {
        const [p, h] = await Promise.all([
          companyReturnsApi.preview(clientId),
          companyReturnsApi.history(clientId).catch(() => [] as ClientReturn[]),
        ]);
        setPreview(p);
        setHistory(h);
        setSelected(new Set(p.lines.map((l) => l.deliveryId)));
        setSearchParams({ clientId }, { replace: true });
      } catch (err) {
        setPreview(null);
        setHistory([]);
        setSelected(new Set());
        setError(
          err instanceof ApiError && err.status === 404
            ? `Aucun client trouvé avec l'ID « ${clientId} ».`
            : returnsErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    },
    [setSearchParams]
  );

  // Deep link from a client page: /company/client-returns?clientId=...
  useEffect(() => {
    const initial = searchParams.get("clientId");
    if (initial) loadClient(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSignedAndPaid(false);
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(lines.map((l) => l.deliveryId)));
    setSignedAndPaid(false);
  }

  /** Fetches the PDF for the current selection (or reuses the one already generated), then prints or saves it. */
  async function handleSlip(mode: "print" | "download") {
    if (!preview || selectedIds.length === 0) return;
    setGenerating(true);
    try {
      let current = slip && slip.key === selectionKey ? slip : null;
      if (!current) {
        const blob = await companyReturnsApi.downloadPdf(preview.client.id, selectedIds);
        current = { key: selectionKey, blob };
        setSlip(current);
      }
      const filename = `bordereau-retour-${preview.client.id}.pdf`;
      if (mode === "print") printBlob(current.blob, filename);
      else downloadBlob(current.blob, filename);
    } catch (err) {
      showToast(returnsErrorMessage(err), "warning");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReprint(ret: ClientReturn) {
    setReprintingId(ret.id);
    try {
      const blob = await companyReturnsApi.downloadReceiptPdf(ret.id);
      printBlob(blob, `bordereau-retour-${ret.id}.pdf`);
    } catch (err) {
      showToast(returnsErrorMessage(err), "warning");
    } finally {
      setReprintingId(null);
    }
  }

  async function handleConfirm() {
    if (!preview || !slipReady || !signedAndPaid) return;
    setValidating(true);
    try {
      // Send the exact packages printed on the slip: the backend marks these — and
      // only these — as handed back, and rejects any that were handled meanwhile.
      const ret = await companyReturnsApi.validate(preview.client.id, selectedIds);
      setReceipt(ret);
      showToast("Retour confirmé", "success");
      refreshDeliveries();
      await loadClient(preview.client.id, true);
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      showToast(
        conflict
          ? "Certains colis ont déjà été restitués. La liste a été actualisée : réimprimez le bordereau."
          : returnsErrorMessage(err),
        "warning"
      );
      if (conflict) await loadClient(preview.client.id, true);
    } finally {
      setValidating(false);
    }
  }

  const canGenerate = selectedIds.length > 0 && returnFeeKnown && !generating;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Retours clients</h1>
      <p className="mt-1 text-ink-500">
        Restituez à un client ses colis annulés : imprimez le bordereau de retour, faites-le signer par le client,
        encaissez les frais de retour, puis confirmez.
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
            list="return-client-ids"
            autoFocus
          />
          <datalist id="return-client-ids">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientFullName(c)}
              </option>
            ))}
          </datalist>
        </div>
        <Button type="submit" disabled={loading || !clientIdInput.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Rechercher
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
            Retour <strong>{receipt.id}</strong> confirmé : {receipt.returnedCount} colis restitué(s), frais de retour
            encaissés <strong>{formatAmount(receipt.feesTotal)}</strong>. Ces colis ne pourront plus être restitués une
            seconde fois.
          </p>
          <PdfIconButton
            className="ml-auto"
            label="Télécharger le bordereau (PDF)"
            filename={`bordereau-retour-${receipt.id}.pdf`}
            getPdf={() => companyReturnsApi.downloadReceiptPdf(receipt.id)}
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
            <Link
              to={`/company/clients/${encodeURIComponent(preview.client.id)}`}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir la fiche client
            </Link>
          </div>

          {!returnFeeKnown && lines.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-4 text-sm text-warn-600">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Les frais de retour ne sont pas définis dans les informations de l'entreprise. Le bordereau ne peut pas
                être généré tant qu'ils ne sont pas renseignés.
              </p>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-go-50 text-go-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold text-ink-900">Aucun colis à restituer</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">
                Tous les colis annulés de ce client lui ont déjà été remis.
              </p>
            </div>
          ) : (
            <>
              {/* Canceled packages */}
              <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
                <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {lines.length} colis annulé(s) à restituer
                  </span>
                  <span className="text-xs text-ink-500">{selectedIds.length} sélectionné(s)</span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Tout sélectionner"
                          className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Colis</th>
                      <th className="hidden px-4 py-3 font-semibold md:table-cell">Désignation</th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">Annulé le</th>
                      <th className="px-4 py-3 text-right font-semibold">Frais de retour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {lines.map((l) => {
                      const checked = selected.has(l.deliveryId);
                      return (
                        <tr
                          key={l.deliveryId}
                          onClick={() => toggle(l.deliveryId)}
                          className={cn("cursor-pointer transition-colors hover:bg-ink-50", !checked && "opacity-55")}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(l.deliveryId)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Sélectionner ${l.deliveryId}`}
                              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/company/deliveries/${encodeURIComponent(l.deliveryId)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 font-medium text-ink-900 hover:text-brand-600"
                            >
                              <PackageX className="h-3.5 w-3.5 text-red-500" />
                              {l.deliveryId}
                            </Link>
                            <p className="text-xs text-ink-500">{l.recipientName}</p>
                          </td>
                          <td className="hidden max-w-[16rem] truncate px-4 py-3 text-ink-600 md:table-cell">
                            {l.designation || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDateTime(l.canceledAt)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-red-600">
                            {returnFeeKnown ? formatAmount(Number(returnFee)) : "?"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals + the 3-step handover */}
              <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-600">
                      {selectedIds.length} colis × frais de retour {returnFeeKnown ? formatAmount(Number(returnFee)) : "?"}
                    </dt>
                    <dd className="font-semibold tabular-nums text-ink-900">{formatAmount(feesTotal)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                    <dt className="font-display font-semibold text-ink-900">Frais à encaisser auprès du client</dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-ink-950">
                      {formatAmount(feesTotal)}
                    </dd>
                  </div>
                </dl>

                <ol className="mt-5 space-y-4 border-t border-ink-100 pt-5">
                  <li>
                    <p className="text-sm font-semibold text-ink-900">1. Imprimer le bordereau de retour</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Le PDF liste les colis restitués et le montant dû, avec un espace de signature pour le client.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button disabled={!canGenerate} onClick={() => handleSlip("print")}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        {slipReady ? "Imprimer à nouveau" : "Générer et imprimer"}
                      </Button>
                      <Button variant="outline" disabled={!canGenerate} onClick={() => handleSlip("download")}>
                        <Download className="h-4 w-4" /> Télécharger le PDF
                      </Button>
                    </div>
                  </li>

                  <li className={cn(!slipReady && "opacity-50")}>
                    <p className="text-sm font-semibold text-ink-900">2. Signature et paiement</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Remettez les colis au client, faites-lui signer le bordereau et encaissez{" "}
                      {formatAmount(feesTotal)}.
                    </p>
                    <label className="mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        disabled={!slipReady}
                        checked={signedAndPaid}
                        onChange={(e) => setSignedAndPaid(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>
                        Le client a signé le bordereau
                        {feesTotal > 0 ? (
                          <>
                            {" "}
                            et réglé <strong>{formatAmount(feesTotal)}</strong>
                          </>
                        ) : null}
                        .
                      </span>
                    </label>
                  </li>

                  <li className={cn(!(slipReady && signedAndPaid) && "opacity-50")}>
                    <p className="text-sm font-semibold text-ink-900">3. Confirmer la restitution</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Les {selectedIds.length} colis seront marqués comme restitués et ne pourront plus l'être à
                      nouveau.
                    </p>
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      className="mt-2.5"
                      disabled={!slipReady || !signedAndPaid || validating}
                      onClick={handleConfirm}
                    >
                      {validating ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <FileSignature className="h-4.5 w-4.5" />
                      )}
                      {validating ? "Confirmation..." : "Confirmer la restitution"}
                    </Button>
                  </li>
                </ol>
              </div>
            </>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
                <History className="h-4 w-4 text-ink-400" /> Retours précédents
              </h2>
              <ul className="divide-y divide-ink-100 text-sm">
                {history.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{r.id}</p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(r.createdAt)} · {r.returnedCount} colis restitué(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="font-semibold tabular-nums text-ink-900">{formatAmount(r.feesTotal)}</p>
                      <PdfIconButton
                        label={`Télécharger le bordereau ${r.id} (PDF)`}
                        filename={`bordereau-retour-${r.id}.pdf`}
                        getPdf={() => companyReturnsApi.downloadReceiptPdf(r.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleReprint(r)}
                        disabled={reprintingId === r.id}
                        title="Réimprimer le bordereau"
                        aria-label={`Réimprimer le bordereau ${r.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
                      >
                        {reprintingId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </button>
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
