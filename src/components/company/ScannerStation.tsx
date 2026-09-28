import { useEffect, useState } from "react";
import { LucideIcon, ScanLine, CheckCircle2, XCircle, WifiOff, Loader2 } from "lucide-react";
import { companyStationsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { STATION_DESCRIPTIONS, STATION_LABELS, StationKind, PublicCompanyInfo } from "@/types";
import { useScannerCapture } from "@/hooks/useScannerCapture";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

type PulseState = "idle" | "scanning" | "success" | "error";

interface ScanLogEntry {
  id: string;
  packageId: string;
  ok: boolean;
  message: string;
  at: string; // ISO
}

const ACCENT = {
  brand: { ring: "ring-brand-500/30", bg: "bg-brand-600", soft: "bg-brand-50 text-brand-600" },
  go: { ring: "ring-go-500/30", bg: "bg-go-600", soft: "bg-go-50 text-go-600" },
  warn: { ring: "ring-red-500/30", bg: "bg-red-600", soft: "bg-red-50 text-red-600" },
} as const;

export function ScannerStation({
  companyId,
  station,
  icon: Icon,
  accent,
}: {
  companyId: string;
  station: StationKind;
  icon: LucideIcon;
  accent: keyof typeof ACCENT;
}) {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [pulse, setPulse] = useState<PulseState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);

  const colors = ACCENT[accent];

  useEffect(() => {
    let cancelled = false;
    companyStationsApi
      .getPublicInfo(companyId)
      .then((c) => !cancelled && setCompany(c))
      .catch((err) => !cancelled && setCompanyError(scanErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useScannerCapture(
    async (packageId) => {
      setPulse("scanning");
      try {
        const result = await companyStationsApi.scan(companyId, station, packageId);
        setPulse("success");
        setLastMessage(`Colis ${result.packageId} enregistré.`);
        setLog((prev) => [{ id: crypto.randomUUID(), packageId: result.packageId, ok: true, message: "Statut mis à jour", at: result.scannedAt }, ...prev].slice(0, 20));
      } catch (err) {
        setPulse("error");
        const message = scanErrorMessage(err);
        setLastMessage(message);
        setLog((prev) => [{ id: crypto.randomUUID(), packageId, ok: false, message, at: new Date().toISOString() }, ...prev].slice(0, 20));
      } finally {
        setTimeout(() => setPulse("idle"), 1600);
      }
    },
    { minLength: 3 }
  );

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-10">
        <img src={logo} width={140} alt="DropLink" className="brightness-0 invert" />
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{company?.name ?? (companyError ? "Entreprise" : "Chargement...")}</p>
          <p className="text-xs text-ink-300">Station · {STATION_LABELS[station]}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div
          className={cn(
            "flex h-40 w-40 items-center justify-center rounded-full ring-8 transition-all duration-300 sm:h-48 sm:w-48",
            pulse === "idle" && cn(colors.bg, colors.ring),
            pulse === "scanning" && "bg-ink-700 ring-white/10 animate-pulse",
            pulse === "success" && "bg-go-600 ring-go-500/30",
            pulse === "error" && "bg-red-600 ring-red-500/30"
          )}
        >
          {pulse === "scanning" ? (
            <Loader2 className="h-16 w-16 animate-spin text-white" />
          ) : pulse === "success" ? (
            <CheckCircle2 className="h-16 w-16 text-white" strokeWidth={2.5} />
          ) : pulse === "error" ? (
            <XCircle className="h-16 w-16 text-white" strokeWidth={2.5} />
          ) : (
            <Icon className="h-16 w-16 text-white" />
          )}
        </div>

        <h1 className="mt-8 font-display text-2xl font-bold sm:text-3xl">{STATION_LABELS[station]}</h1>
        <p className="mt-2 max-w-md text-ink-300">{STATION_DESCRIPTIONS[station]}</p>

        <div className="mt-6 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-ink-200">
          <ScanLine className="h-4 w-4" />
          {pulse === "idle" && "En attente d'un scan..."}
          {pulse === "scanning" && "Enregistrement du colis..."}
          {pulse === "success" && lastMessage}
          {pulse === "error" && lastMessage}
        </div>

        {/*companyError && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-warn-500/10 px-4 py-2.5 text-sm text-warn-500">
            <WifiOff className="h-4 w-4" /> {companyError}
          </div>
        )*/}
      </main>

      <footer className="border-t border-white/10 px-6 py-4 sm:px-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Derniers scans</p>
        {log.length === 0 ? (
          <p className="text-sm text-ink-400">Aucun scan pour le moment.</p>
        ) : (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5">
                <span className="flex items-center gap-2 truncate">
                  {entry.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-go-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  )}
                  <span className="truncate font-medium text-white">{entry.packageId}</span>
                  <span className="truncate text-ink-400">{entry.message}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-500">{new Date(entry.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  );
}

function scanErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
