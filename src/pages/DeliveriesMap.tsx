import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import { usePlanner } from "@/context/DriverPlannerContext";
import { RouteMap } from "@/components/RouteMap";

/** Full-height map of today's route (numbered in visiting order). */
export default function DeliveriesMap() {
  const { plan, driverLocation } = usePlanner();
  const located = plan.stops.filter((s) => s.point).length;
  const unlocated = plan.stops.filter((s) => !s.point);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Carte</h1>
        <p className="mt-1 text-ink-500">
          {located} arrêt(s) sur la carte, numérotés dans l'ordre conseillé
          {unlocated.length > 0 ? ` · ${unlocated.length} sans position` : ""}.
        </p>
      </div>

      {plan.stops.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <MapPinOff className="mb-3 h-8 w-8 text-ink-300" />
          <p className="font-display font-semibold text-ink-900">Aucun arrêt à afficher</p>
        </div>
      ) : (
        <div className="h-[calc(100vh-15rem)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-100 shadow-card">
          <RouteMap stops={plan.stops} driver={driverLocation ? { lat: driverLocation.lat, lon: driverLocation.lon } : null} />
        </div>
      )}

      {unlocated.length > 0 && (
        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
          <p className="mb-2 text-sm font-semibold text-ink-900">Sans position sur la carte</p>
          <ul className="space-y-1.5 text-sm">
            {unlocated.map((s) => (
              <li key={s.delivery.id}>
                <Link to={`/deliveries/${s.delivery.id}`} className="text-brand-600 hover:underline">
                  #{s.order} {s.delivery.customerName}
                </Link>
                <span className="text-ink-500"> · {[s.delivery.address, s.delivery.delegation].filter(Boolean).join(" · ") || "adresse manquante"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
