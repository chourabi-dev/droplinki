import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { Loader2, AlertCircle, MapPinned, ArrowRight } from "lucide-react";
import { useDeliveries } from "@/context/DeliveryContext";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { Delivery, DeliveryStatus, STATUS_LABELS } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, formatAmount } from "@/lib/utils";

const MARKER_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "#F0A020",
  location_received: "#17A34A",
  opened: "#4338EA",
  delivered: "#6B7280",
};

function customerIcon(status: DeliveryStatus) {
  const color = MARKER_COLORS[status];
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px 9999px 9999px 0;transform:rotate(45deg);background:${color};box-shadow:0 4px 12px rgba(0,0,0,0.25);border:3px solid white;">
      <div style="transform:rotate(-45deg);display:flex;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 28],
    popupAnchor: [0, -28],
  });
}

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#4338EA;box-shadow:0 4px 12px rgba(67,56,234,0.45);border:3px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

type Located = Delivery & { customerLatitude: number; customerLongitude: number };

function FitToMarkers({ points }: { points: { lat: number; lon: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lon], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => `${p.lat},${p.lon}`).join("|")]);
  return null;
}

/** See MapView.tsx for why this is needed: Leaflet sizes itself once at
 * mount, so if this page's container isn't laid out yet the map renders as
 * an empty grey box until something forces a remeasure. */
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timeout = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [map]);
  return null;
}

const LEGEND: { status: DeliveryStatus; label: string }[] = [
  { status: "waiting_location", label: STATUS_LABELS.waiting_location },
  { status: "opened", label: STATUS_LABELS.opened },
  { status: "location_received", label: STATUS_LABELS.location_received },
  { status: "delivered", label: STATUS_LABELS.delivered },
];

export default function DeliveriesMap() {
  const { deliveries, isLoading, error } = useDeliveries();
  const { location: driverLocation } = useLiveLocation();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");

  const located = useMemo<Located[]>(
    () =>
      deliveries.filter(
        (d): d is Located => typeof d.customerLatitude === "number" && typeof d.customerLongitude === "number"
      ),
    [deliveries]
  );

  const filtered = useMemo(
    () => (statusFilter === "all" ? located : located.filter((d) => d.status === statusFilter)),
    [located, statusFilter]
  );

  const points = useMemo(() => {
    const pts = filtered.map((d) => ({ lat: d.customerLatitude, lon: d.customerLongitude }));
    if (driverLocation) pts.push({ lat: driverLocation.lat, lon: driverLocation.lon });
    return pts;
  }, [filtered, driverLocation]);

  const center = driverLocation ?? { lat: 36.8065, lon: 10.1815 };
  const missingCount = deliveries.length - located.length;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Carte</h1>
          <p className="mt-1 text-ink-500">
            {located.length} livraison(s) localisée(s) sur la carte
            {missingCount > 0 ? ` · ${missingCount} en attente de position` : ""}.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 dl-scroll">
        <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
          Toutes ({located.length})
        </FilterPill>
        {LEGEND.map((l) => {
          const count = located.filter((d) => d.status === l.status).length;
          return (
            <FilterPill key={l.status} active={statusFilter === l.status} onClick={() => setStatusFilter(l.status)}>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MARKER_COLORS[l.status] }} />
                {l.label} ({count})
              </span>
            </FilterPill>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : located.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <MapPinned className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucune livraison localisée pour l'instant</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">
            Les livraisons apparaîtront ici dès que leurs clients auront partagé leur position.
          </p>
        </div>
      ) : (
        <div className="h-[calc(100vh-19rem)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-100 shadow-card">
          <MapContainer center={[center.lat, center.lon]} zoom={13} style={{ width: "100%", height: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {driverLocation && (
              <Marker position={[driverLocation.lat, driverLocation.lon]} icon={driverIcon}>
                <Popup>
                  <p className="text-sm font-semibold text-ink-900">Votre position</p>
                </Popup>
              </Marker>
            )}
            {filtered.map((d) => (
              <Marker
                key={d.id}
                position={[d.customerLatitude, d.customerLongitude]}
                icon={customerIcon(d.status)}
              >
                <Popup minWidth={220}>
                  <div className="min-w-[200px]">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold text-ink-900">{d.customerName}</p>
                      <span className="text-xs text-ink-500">{d.id}</span>
                    </div>
                    <StatusBadge status={d.status} className="mb-2" />
                    <div className="space-y-0.5 text-xs text-ink-500">
                      <p>{formatDateTime(d.createdAt)}</p>
                      {d.amount !== undefined && <p>{formatAmount(d.amount)}</p>}
                    </div>
                    <button
                      onClick={() => navigate(`/deliveries/${d.id}`)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      Voir les détails <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FitToMarkers points={points} />
            <InvalidateSizeOnMount />
          </MapContainer>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
        (active ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50")
      }
    >
      {children}
    </button>
  );
}
