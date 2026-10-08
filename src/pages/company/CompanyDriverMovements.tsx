import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, AlertCircle, Check, Loader2, MapPinOff, RefreshCw, Route as RouteIcon, Timer, MapPin } from "lucide-react";
import { useCompanyDrivers, companyErrorMessage } from "@/context/CompanyDriverContext";
import { companyDriversApi, DriverMovementsRange } from "@/lib/companyApi";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DriverLocationPoint, companyDriverFullName } from "@/types";

// ---------------------------------------------------------------------------
// Date ranges
// ---------------------------------------------------------------------------

const RANGES: { value: DriverMovementsRange; label: string }[] = [
  { value: 0, label: "Aujourd'hui" },
  { value: 1, label: "Hier" },
  { value: 7, label: "7 derniers jours" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineKm(a: DriverLocationPoint, b: DriverLocationPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "< 1 min";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

function formatTime(iso: string, withDate: boolean): string {
  const d = new Date(iso);
  return withDate
    ? d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Map pieces
// ---------------------------------------------------------------------------

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#17A34A;border:3px solid white;box-shadow:0 2px 8px rgba(23,163,74,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const endIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:#4338EA;box-shadow:0 4px 12px rgba(67,56,234,0.45);border:3px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

/** Fits the map to the whole trail whenever the set of points changes. */
function FitToTrail({ points }: { points: DriverLocationPoint[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])),
      { padding: [48, 48], maxZoom: 17 }
    );
  }, [map, points]);
  return null;
}

// ---------------------------------------------------------------------------
// Loading screen
// ---------------------------------------------------------------------------

type LoadStage = "points" | "map" | "done";

function LoadingScreen({ stage }: { stage: LoadStage }) {
  const steps: { id: LoadStage; label: string }[] = [
    { id: "points", label: "Récupération des positions du livreur" },
    { id: "map", label: "Chargement de la carte" },
  ];
  const currentIndex = stage === "points" ? 0 : 1;

  return (
    <div
      className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-6 bg-white/95 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <svg viewBox="0 0 220 90" className="h-24 w-56" aria-hidden="true">
        <path
          d="M10 70 C 40 70, 40 20, 80 30 S 130 75, 160 45 S 195 20, 210 22"
          fill="none"
          stroke="#E0E7FF"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          className="dl-trail"
          d="M10 70 C 40 70, 40 20, 80 30 S 130 75, 160 45 S 195 20, 210 22"
          fill="none"
          stroke="#4338EA"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength={100}
        />
        <circle cx="10" cy="70" r="6" fill="#17A34A" stroke="white" strokeWidth="2.5" />
      </svg>

      <div className="text-center">
        <p className="font-display text-lg font-semibold text-ink-900">Préparation du parcours</p>
        <p className="mt-1 text-sm text-ink-500">Cela ne prend que quelques secondes.</p>
      </div>

      <ol className="w-full max-w-xs space-y-2.5">
        {steps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  done && "bg-go-500 text-white",
                  active && "bg-brand-50 text-brand-600",
                  !done && !active && "bg-ink-100 text-ink-300"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              </span>
              <span className={cn(done ? "text-ink-500" : active ? "font-medium text-ink-900" : "text-ink-300")}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CompanyDriverMovements() {
  const { id } = useParams<{ id: string }>();
  const { getDriver, isLoading: driversLoading } = useCompanyDrivers();
  const driver = id ? getDriver(id) : undefined;

  const [range, setRange] = useState<DriverMovementsRange>(0);
  const [points, setPoints] = useState<DriverLocationPoint[]>([]);
  const [stage, setStage] = useState<LoadStage>("points");
  const [error, setError] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    if (!id) return;
    const seq = ++requestSeq.current;
    setStage("points");
    setError(null);
    try {
      const result = await companyDriversApi.locations(id, range);
      if (seq !== requestSeq.current) return; // a newer request replaced this one
      setPoints(result);
      // Fresh map instance per fetch so its tile "load" event fires again.
      setMapKey((k) => k + 1);
      // With no points there is no map to wait for.
      setStage(result.length > 0 ? "map" : "done");
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setPoints([]);
      setError(companyErrorMessage(err));
      setStage("done");
    }
  }, [id, range]);

  useEffect(() => {
    load();
  }, [load]);

  // Safety net: never leave the loading screen up if tiles never report "load"
  // (offline, blocked tile server...). The map is usable either way.
  useEffect(() => {
    if (stage !== "map") return;
    const t = setTimeout(() => setStage("done"), 4000);
    return () => clearTimeout(t);
  }, [stage]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let km = 0;
    for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
    const first = new Date(points[0].recordedAt).getTime();
    const last = new Date(points[points.length - 1].recordedAt).getTime();
    return { km, durationMs: last - first, first: points[0], last: points[points.length - 1] };
  }, [points]);

  const path = useMemo(() => points.map((p) => [p.latitude, p.longitude] as [number, number]), [points]);
  const multiDay = range === 7;
  const showMap = points.length > 0;

  if (driversLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">Livreur introuvable</p>
        <Link to="/company/drivers" className="mt-3 text-sm font-medium text-brand-600 hover:underline">
          Retour à la liste des livreurs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/company/drivers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Livreurs
      </Link>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Mouvements de {companyDriverFullName(driver)}</h1>
          <p className="mt-1 text-ink-500">Parcours enregistré à partir des positions GPS du livreur.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Période">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                range === r.value ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {stats && stage === "done" && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<RouteIcon className="h-4 w-4" />} label="Distance" value={formatDistance(stats.km)} />
          <Stat icon={<Timer className="h-4 w-4" />} label="Durée" value={formatDuration(stats.durationMs)} />
          <Stat icon={<MapPin className="h-4 w-4" />} label="Départ" value={formatTime(stats.first.recordedAt, multiDay)} />
          <Stat icon={<MapPin className="h-4 w-4" />} label="Dernière position" value={formatTime(stats.last.recordedAt, multiDay)} />
        </div>
      )}

      <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 shadow-card">
        {showMap && (
          <MapContainer
            key={mapKey}
            center={path[path.length - 1]}
            zoom={14}
            scrollWheelZoom
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{ load: () => setStage((s) => (s === "map" ? "done" : s)) }}
            />
            {/* White casing under the route so it stays readable on busy tiles */}
            <Polyline positions={path} pathOptions={{ color: "#FFFFFF", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round" }} />
            <Polyline positions={path} pathOptions={{ color: "#4338EA", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />

            {points.length <= 200 &&
              points.slice(1, -1).map((p, i) => (
                <CircleMarker
                  key={`${p.recordedAt}-${i}`}
                  center={[p.latitude, p.longitude]}
                  radius={3.5}
                  pathOptions={{ color: "#4338EA", weight: 1.5, fillColor: "#FFFFFF", fillOpacity: 1 }}
                >
                  <Tooltip direction="top" offset={[0, -4]}>
                    {formatTime(p.recordedAt, multiDay)}
                    {p.speedKmh != null ? ` · ${Math.round(p.speedKmh)} km/h` : ""}
                  </Tooltip>
                </CircleMarker>
              ))}

            <Marker position={path[0]} icon={startIcon}>
              <Tooltip direction="top" offset={[0, -8]}>
                Départ · {formatTime(points[0].recordedAt, multiDay)}
              </Tooltip>
            </Marker>
            {points.length > 1 && (
              <Marker position={path[path.length - 1]} icon={endIcon}>
                <Tooltip direction="top" offset={[0, -16]}>
                  Dernière position · {formatTime(points[points.length - 1].recordedAt, multiDay)}
                </Tooltip>
              </Marker>
            )}
            <FitToTrail points={points} />
          </MapContainer>
        )}

        {stage !== "done" && <LoadingScreen stage={stage} />}

        {stage === "done" && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
            <p className="font-display font-semibold text-ink-900">Impossible de charger les mouvements</p>
            <p className="mt-1 max-w-sm text-sm text-ink-500">{error}</p>
            <Button size="sm" className="mt-5" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Réessayer
            </Button>
          </div>
        )}

        {stage === "done" && !error && !showMap && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
              <MapPinOff className="h-6 w-6" />
            </div>
            <p className="font-display font-semibold text-ink-900">Aucun déplacement enregistré</p>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              Aucune position GPS n'a été reçue pour cette période. Essayez une période plus large.
            </p>
            {range !== 7 && (
              <Button size="sm" variant="ghost" className="mt-5" onClick={() => setRange(7)}>
                Voir les 7 derniers jours
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-soft">
      <p className="flex items-center gap-1.5 text-xs text-ink-500">
        <span className="text-brand-600">{icon}</span> {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
