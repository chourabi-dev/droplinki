import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:#4338EA;box-shadow:0 4px 12px rgba(67,56,234,0.45);border:3px solid white;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  className: "",
  html: `<div class="dl-pulse" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px 9999px 9999px 0;transform:rotate(45deg);background:#17A34A;box-shadow:0 4px 12px rgba(23,163,74,0.45);border:3px solid white;">
    <div style="transform:rotate(-45deg);display:flex;">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>
    </div>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 30],
});

interface MapViewProps {
  driver?: { lat: number; lon: number };
  customer?: { lat: number; lon: number };
  className?: string;
  zoom?: number;
  interactive?: boolean;
}

function FitBounds({ driver, customer }: { driver?: { lat: number; lon: number }; customer?: { lat: number; lon: number } }) {
  const map = useMap();
  useEffect(() => {
    if (driver && customer) {
      const bounds = L.latLngBounds([
        [driver.lat, driver.lon],
        [customer.lat, customer.lon],
      ]);
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15 });
    } else if (customer) {
      map.setView([customer.lat, customer.lon], 15);
    } else if (driver) {
      map.setView([driver.lat, driver.lon], 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.lat, driver?.lon, customer?.lat, customer?.lon]);
  return null;
}

export function MapView({ driver, customer, className, zoom = 14, interactive = true }: MapViewProps) {
  const center = customer || driver || { lat: 36.8065, lon: 10.1815 };

  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {driver && customer && (
          <Polyline
            positions={[
              [driver.lat, driver.lon],
              [customer.lat, customer.lon],
            ]}
            pathOptions={{ color: "#4338EA", weight: 3, dashArray: "1, 10", lineCap: "round" }}
          />
        )}
        {driver && <Marker position={[driver.lat, driver.lon]} icon={driverIcon} />}
        {customer && <Marker position={[customer.lat, customer.lon]} icon={customerIcon} />}
        <FitBounds driver={driver} customer={customer} />
      </MapContainer>
    </div>
  );
}
