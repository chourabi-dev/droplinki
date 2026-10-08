import { useCallback, useEffect, useRef, useState } from "react";
import { LucideIcon, ScanLine, CheckCircle2, XCircle, Loader2, User, Phone, Truck as TruckIcon, Timer, UserX } from "lucide-react";
import { companyStationsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import {
  STATION_DESCRIPTIONS,
  STATION_LABELS,
  StationKind,
  PublicCompanyInfo,
  StationDriver,
  VEHICLE_TYPE_LABELS,
} from "@/types";
import { useScannerCapture } from "@/hooks/useScannerCapture";
import { installStationSoundUnlock, playErrorBuzz, playScanBeep } from "@/lib/stationSound";
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

/** With no scan at all for this long, the driver badge must be scanned again. */
export const DRIVER_SESSION_TIMEOUT_MS = 15 * 60 * 1000;

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
  requireDriver = false,
  soundFeedback = false,
}: {
  companyId: string;
  station: StationKind;
  icon: LucideIcon;
  accent: keyof typeof ACCENT;
  /**
   * Loading-station mode: the driver badge must be scanned first, the driver
   * stays on screen, and the session expires after DRIVER_SESSION_TIMEOUT_MS
   * without any scan. The driver is kept in memory only, so a page refresh
   * also forgets it (on purpose).
   */
  requireDriver?: boolean;
  /** Loud beep on every scan (and a distinct buzz on errors). */
  soundFeedback?: boolean;
}) {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [pulse, setPulse] = useState<PulseState>("idle");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [log, setLog] = useState<ScanLogEntry[]>([]);

  // --- driver session (only used when `requireDriver`) ---------------------
  const [driver, setDriver] = useState<StationDriver | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [remainingMs, setRemainingMs] = useState(DRIVER_SESSION_TIMEOUT_MS);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  // Refs mirror the state so that two scans arriving a few ms apart never
  // read a stale value from a closure.
  const driverRef = useRef<StationDriver | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lookingUpRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Make the first scan audible (browsers block sound before a user gesture).
  useEffect(() => {
    if (!soundFeedback) return;
    return installStationSoundUnlock();
  }, [soundFeedback]);

  const clearDriver = useCallback((notice: string | null) => {
    driverRef.current = null;
    setDriver(null);
    setLoadedCount(0);
    setSessionNotice(notice);
  }, []);

  // Inactivity watchdog. Compares timestamps instead of trusting one long
  // setTimeout, because browsers throttle timers in background tabs.
  useEffect(() => {
    if (!requireDriver || !driver) return;
    const tick = () => {
      const remaining = DRIVER_SESSION_TIMEOUT_MS - (Date.now() - lastActivityRef.current);
      if (remaining <= 0) {
        clearDriver("Session expirée après 15 min sans scan. Scannez à nouveau le badge du chauffeur.");
      } else {
        setRemainingMs(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [requireDriver, driver, clearDriver]);

  const settleToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setPulse("idle"), 1600);
  }, []);

  useEffect(() => () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const handleBadgeScan = useCallback(
    async (badge: string) => {
      lookingUpRef.current = true;
      setPulse("scanning");
      setSessionNotice(null);
      try {
        const found = await companyStationsApi.lookupDriverBadge(companyId, badge);
        driverRef.current = found;
        lastActivityRef.current = Date.now();
        setRemainingMs(DRIVER_SESSION_TIMEOUT_MS);
        setLoadedCount(0);
        setDriver(found);
        setPulse("success");
        setLastMessage(`Chauffeur identifié : ${found.firstName} ${found.lastName}`.trim());
      } catch (err) {
        if (soundFeedback) playErrorBuzz();
        setPulse("error");
        setLastMessage(err instanceof ApiError && err.status === 404 ? "Badge inconnu. Réessayez avec le badge du chauffeur." : scanErrorMessage(err));
      } finally {
        lookingUpRef.current = false;
        settleToIdle();
      }
    },
    [companyId, soundFeedback, settleToIdle]
  );

  const handlePackageScan = useCallback(
    async (packageId: string) => {
      lastActivityRef.current = Date.now();
      setPulse("scanning");
      try {
        const result = await companyStationsApi.scan(companyId, station, packageId, driverRef.current?.id);
        setPulse("success");
        setLastMessage(`Colis ${result.packageId} enregistré.`);
        if (requireDriver) setLoadedCount((n) => n + 1);
        setLog((prev) => [{ id: crypto.randomUUID(), packageId: result.packageId, ok: true, message: "Statut mis à jour", at: result.scannedAt }, ...prev].slice(0, 20));
      } catch (err) {
        if (soundFeedback) playErrorBuzz();
        setPulse("error");
        const message = scanErrorMessage(err);
        setLastMessage(message);
        setLog((prev) => [{ id: crypto.randomUUID(), packageId, ok: false, message, at: new Date().toISOString() }, ...prev].slice(0, 20));
      } finally {
        settleToIdle();
      }
    },
    [companyId, station, requireDriver, soundFeedback, settleToIdle]
  );

  useScannerCapture(
    async (code) => {
      // 1) Audible confirmation the very instant the gun's read is received —
      //    before any network round-trip.
      if (soundFeedback) playScanBeep();

      if (requireDriver && !driverRef.current) {
        if (lookingUpRef.current) {
          // A package was scanned while the badge is still being checked.
          if (soundFeedback) playErrorBuzz();
          setPulse("error");
          setLastMessage("Vérification du badge en cours, rescannez le colis.");
          settleToIdle();
          return;
        }
        await handleBadgeScan(code);
        return;
      }
      await handlePackageScan(code);
    },
    { minLength: 3 }
  );

  const needsDriver = requireDriver && !driver;

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
        {requireDriver && driver && (
          <DriverCard
            driver={driver}
            loadedCount={loadedCount}
            remainingMs={remainingMs}
            onChange={() => clearDriver(null)}
          />
        )}

        <div
          className={cn(
            "flex h-40 w-40 items-center justify-center rounded-full ring-8 transition-all duration-300 sm:h-48 sm:w-48",
            driver && "mt-8",
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
          ) : needsDriver ? (
            <User className="h-16 w-16 text-white" />
          ) : (
            <Icon className="h-16 w-16 text-white" />
          )}
        </div>

        <h1 className="mt-8 font-display text-2xl font-bold sm:text-3xl">
          {needsDriver ? "Scannez le badge du chauffeur" : STATION_LABELS[station]}
        </h1>
        <p className="mt-2 max-w-md text-ink-300">
          {needsDriver
            ? "Le chauffeur doit être identifié avant de charger les colis dans son camion."
            : STATION_DESCRIPTIONS[station]}
        </p>

        {sessionNotice && needsDriver && pulse === "idle" && (
          <div className="mt-4 flex max-w-md items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            <UserX className="h-4 w-4 shrink-0" /> {sessionNotice}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-ink-200">
          <ScanLine className="h-4 w-4" />
          {pulse === "idle" && (needsDriver ? "En attente du badge chauffeur..." : "En attente d'un scan...")}
          {pulse === "scanning" && (needsDriver ? "Vérification du badge..." : "Enregistrement du colis...")}
          {pulse === "success" && lastMessage}
          {pulse === "error" && lastMessage}
        </div>
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

/** Who is loading right now — big and readable from a distance. */
function DriverCard({
  driver,
  loadedCount,
  remainingMs,
  onChange,
}: {
  driver: StationDriver;
  loadedCount: number;
  remainingMs: number;
  onChange: () => void;
}) {
  const fullName = `${driver.firstName} ${driver.lastName}`.trim();
  const initials = `${driver.firstName?.[0] ?? ""}${driver.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const expiringSoon = remainingMs <= 2 * 60 * 1000;
  const vehicle = [driver.vehicleType ? VEHICLE_TYPE_LABELS[driver.vehicleType] : null, driver.plateNumber].filter(Boolean).join(" · ");

  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-go-600 text-2xl font-bold">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-go-500">Chauffeur</p>
          <p className="truncate font-display text-2xl font-bold sm:text-3xl">{fullName}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-300">
            {driver.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> {driver.phone}
              </span>
            )}
            {vehicle && (
              <span className="flex items-center gap-1.5">
                <TruckIcon className="h-3.5 w-3.5" /> {vehicle}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl font-bold leading-none">{loadedCount}</p>
          <p className="mt-1 text-xs text-ink-400">colis chargés</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
        <span className={cn("flex items-center gap-1.5", expiringSoon ? "font-semibold text-red-400" : "text-ink-400")}>
          <Timer className="h-3.5 w-3.5" />
          Badge à rescanner dans {mins}:{String(secs).padStart(2, "0")} sans scan
        </span>
        <button
          type="button"
          onClick={onChange}
          className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/20"
        >
          Changer de chauffeur
        </button>
      </div>
    </div>
  );
}

function scanErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
