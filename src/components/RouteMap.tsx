import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Stop, LatLon, navigateUrl } from "@/lib/routing";

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:9999px;background:#101828;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
    <div style="width:10px;height:10px;border-radius:9999px;background:#17A34A;box-shadow:0 0 0 4px rgba(23,163,74,.3)"></div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function stopIcon(s: Stop, highlight: boolean) {
  const approx = s.precision === "zone" || s.precision === "address";
  const bg = s.due ? "#F59E0B" : highlight ? "#4338EA" : "#5B5FEF";
  const border = approx ? "3px dashed white" : "3px solid white";
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:9999px;background:${bg};border:${border};box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font:700 13px Sora,system-ui,sans-serif;">${s.order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function Fit({ points }: { points: LatLon[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join("|");
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lon], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number])), { padding: [48, 48], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [map]);
  return null;
}

interface Props {
  stops: Stop[];
  driver?: LatLon | null;
  className?: string;
}

/** Numbered stops joined by the planned path, starting from the driver. Dashed pins = approximate position. */
export function RouteMap({ stops, driver, className }: Props) {
  const navigate = useNavigate();
  const located = stops.filter((s) => s.point);
  const path: LatLon[] = [...(driver ? [driver] : []), ...located.map((s) => s.point!)];
  const center = path[0] ?? { lat: 36.8065, lon: 10.1815 };

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer center={[center.lat, center.lon]} zoom={12} style={{ width: "100%", height: "100%" }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {path.length > 1 && (
          <Polyline positions={path.map((p) => [p.lat, p.lon] as [number, number])} pathOptions={{ color: "#4338EA", weight: 3, opacity: 0.7, dashArray: "6 8" }} />
        )}
        {driver && <Marker position={[driver.lat, driver.lon]} icon={driverIcon} />}
        {located.map((s, i) => {
          const nav = navigateUrl(s.delivery);
          return (
            <Marker key={s.delivery.id} position={[s.point!.lat, s.point!.lon]} icon={stopIcon(s, i === 0)}>
              <Popup minWidth={200}>
                <p className="font-display text-sm font-semibold text-ink-900">
                  {s.order}. {s.delivery.customerName}
                </p>
                <p className="mb-2 text-xs text-ink-500">{[s.delivery.address, s.delivery.delegation].filter(Boolean).join(" · ")}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/deliveries/${s.delivery.id}`)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2.5 py-2 text-xs font-semibold text-white"
                  >
                    Détails <ArrowRight className="h-3 w-3" />
                  </button>
                  {nav && (
                    <a href={nav} target="_blank" rel="noreferrer" className="rounded-lg bg-ink-900 px-2.5 py-2 text-xs font-semibold text-white">
                      Y aller
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        <Fit points={path} />
      </MapContainer>
    </div>
  );
}
