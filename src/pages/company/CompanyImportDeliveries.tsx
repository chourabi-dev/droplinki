import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud, Download, AlertCircle, CheckCircle2, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { companyDeliveryErrorMessage } from "@/context/CompanyDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { parseDeliveriesCsv, downloadCsvTemplate } from "@/lib/csv";
import { CsvImportRow } from "@/types";
import { formatAmount } from "@/lib/utils";

export default function CompanyImportDeliveries() {
  const navigate = useNavigate();
  const { importCsv } = useCompanyDeliveries();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ row: number; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    setResult(null);
    setSubmitError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseDeliveriesCsv(text);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
    };
    reader.readAsText(file);
  }

  function reset() {
    setFileName(null);
    setRows([]);
    setParseErrors([]);
    setResult(null);
    setSubmitError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await importCsv(rows);
      setResult({ created: res.created.length, failed: res.errors.length });
      if (res.created.length > 0) {
        showToast(`${res.created.length} livraison(s) importée(s)`, "success");
      }
    } catch (err) {
      const message = companyDeliveryErrorMessage(err);
      setSubmitError(message);
      showToast(message, "warning");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Importer des livraisons (CSV)</h1>
          <p className="mt-1.5 text-ink-500">Créez plusieurs livraisons d'un coup à partir d'un fichier CSV.</p>
        </div>
        <Button variant="outline" onClick={downloadCsvTemplate}>
          <Download className="h-4 w-4" /> Modèle CSV
        </Button>
      </div>

      {!fileName && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`mt-6 flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
            dragOver ? "border-brand-400 bg-brand-50" : "border-ink-200 bg-white"
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="font-display font-semibold text-ink-900">Glissez-déposez votre fichier CSV ici</p>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Colonnes attendues : <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">customerName</code>,{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">customerPhone</code>, et optionnellement{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">reference</code>,{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">amount</code>,{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">notes</code>,{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">address</code>.
          </p>
          <Button className="mt-5" onClick={() => fileInputRef.current?.click()}>
            Choisir un fichier
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      )}

      {fileName && (
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-ink-900">{fileName}</p>
                <p className="text-xs text-ink-500">
                  {rows.length} ligne(s) valide(s)
                  {parseErrors.length > 0 && `, ${parseErrors.length} erreur(s)`}
                </p>
              </div>
            </div>
            <button onClick={reset} className="rounded-lg p-2 text-ink-400 hover:bg-ink-50" aria-label="Retirer le fichier">
              <X className="h-4 w-4" />
            </button>
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-2xl border border-warn-500/20 bg-warn-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warn-700">
                <AlertCircle className="h-4 w-4" /> {parseErrors.length} ligne(s) ignorée(s)
              </p>
              <ul className="mt-2 space-y-1 text-xs text-warn-700">
                {parseErrors.slice(0, 8).map((e, i) => (
                  <li key={i}>
                    Ligne {e.row} : {e.message}
                  </li>
                ))}
                {parseErrors.length > 8 && <li>… et {parseErrors.length - 8} de plus.</li>}
              </ul>
            </div>
          )}

          {rows.length > 0 && !result && (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Téléphone</th>
                      <th className="px-4 py-3 font-semibold">Référence</th>
                      <th className="px-4 py-3 font-semibold">Montant</th>
                      <th className="px-4 py-3 font-semibold">Adresse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 font-medium text-ink-900">{r.customerName}</td>
                        <td className="px-4 py-2.5 text-ink-600">{r.customerPhone}</td>
                        <td className="px-4 py-2.5 text-ink-500">{r.reference || "—"}</td>
                        <td className="px-4 py-2.5 text-ink-500">{r.amount !== undefined ? formatAmount(r.amount) : "—"}</td>
                        <td className="px-4 py-2.5 text-ink-500">{r.address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          {result ? (
            <div className="flex flex-col items-center rounded-2xl border border-go-500/20 bg-go-50 p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-go-500/10 text-go-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold text-ink-900">{result.created} livraison(s) importée(s)</p>
              {result.failed > 0 && <p className="mt-1 text-sm text-ink-500">{result.failed} ligne(s) rejetée(s) par le serveur.</p>}
              <div className="mt-5 flex gap-2">
                <Button variant="outline" onClick={reset}>
                  Importer un autre fichier
                </Button>
                <Button onClick={() => navigate("/company/deliveries")}>Voir les livraisons</Button>
              </div>
            </div>
          ) : (
            rows.length > 0 && (
              <Button fullWidth disabled={submitting} onClick={handleImport}>
                {submitting ? "Import en cours..." : `Importer ${rows.length} livraison(s)`}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
