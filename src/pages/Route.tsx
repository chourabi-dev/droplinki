import { useState } from "react";
import { Link } from "react-router-dom";
import { Navigation, MapPinOff, Loader2, CalendarClock, PackageOpen, Route as RouteIcon, ListOrdered, Map as MapIcon, RefreshCw } from "lucide-react";
import { usePlanner } from "@/context/DriverPlannerContext";
import { useDeliveries } from "@/context/DeliveryContext";
import { DeliveryCard, formatSlot } from "@/components/DeliveryCard";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/Button";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { formatDuration, formatKm, routeUrl, scheduledMs } from "@/lib/routing";
import { cn } from "@/lib/utils";

export default function RoutePage() {
  const { plan, driverLocation, geocodingPending } = usePlanner();
  const { refresh, isLoading } = useDeliveries();
  const { callDelivery, rescheduleDelivery, sheets } = useDeliveryActions();
  const [view, setView] = useState<"list" | "map">("list");

  const gmaps = routeUrl(plan.stops);
  const unlocated = plan.stops.filter((s) => s.precision === "none");
  const waiting = [...plan.later, ...plan.parked];

  return (
    <div>
      {sheets}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Ma tournée</h1>
          <p className="mt-1 text-ink-500">
            Classée du plus proche au plus éloigné, puis optimisée pour éviter les détours.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Actualiser
          </Button>
          {gmaps && (
            <a href={gmaps} target="_blank" rel="noreferrer">
              <Button size="sm">
                <Navigation className="h-4 w-4" /> Lancer dans Google Maps
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Arrêts" value={String(plan.stops.length)} />
        <Stat label="Distance" value={formatKm(plan.totalKm)} />
        <Stat label="Durée estimée" value={plan.stops.length ? formatDuration(plan.totalMin) : "—"} />
      </div>

      {!plan.fromDriver && plan.stops.length > 0 && (
        <p className="mb-4 rounded-xl border border-warn-500/30 bg-warn-50 p-3 text-xs text-ink-700">
          Votre position n'est pas disponible : distances et durées sont calculées entre les arrêts uniquement.
        </p>
      )}
      {geocodingPending > 0 && (
        <p className="mb-4 flex items-center gap-2 text-xs text-ink-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Localisation de {geocodingPending} adresse(s)… l'ordre sera mis à jour.
        </p>
      )}

      {/* mobile toggle */}
      <div className="mb-4 flex rounded-xl bg-ink-100 p-1 lg:hidden">
        {[
          { k: "list" as const, label: "Liste", icon: ListOrdered },
          { k: "map" as const, label: "Carte", icon: MapIcon },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold",
              view === t.k ? "bg-white text-ink-900 shadow-soft" : "text-ink-500"
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className={cn("space-y-3", view === "map" && "hidden lg:block")}>
          {plan.stops.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
              <RouteIcon className="mb-3 h-8 w-8 text-ink-300" />
              <p className="font-display font-semibold text-ink-900">Aucun arrêt dans la tournée</p>
              <p className="mt-1 max-w-xs text-sm text-ink-500">Les colis chargés sur le camion et assignés à vous apparaissent ici.</p>
            </div>
          ) : (
            plan.stops.map((s) => (
              <DeliveryCard key={s.delivery.id} delivery={s.delivery} stop={s} onCall={callDelivery} onReschedule={rescheduleDelivery} />
            ))
          )}

          {unlocated.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <MapPinOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {unlocated.length} arrêt(s) sans position : ils sont placés près des livraisons de leur zone, sans distance. Appelez le client pour confirmer.
            </p>
          )}
        </div>

        <div className={cn(view === "list" && "hidden lg:block")}>
          <div className="sticky top-24 h-[65vh] min-h-[380px] overflow-hidden rounded-2xl border border-ink-100 shadow-card">
            <RouteMap stops={plan.stops} driver={driverLocation ? { lat: driverLocation.lat, lon: driverLocation.lon } : null} />
          </div>
          <p className="mt-2 text-xs text-ink-500">Pastille en pointillés = position estimée à partir de l'adresse ou de la zone.</p>
        </div>
      </div>

      {waiting.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
            <CalendarClock className="h-5 w-5 text-warn-600" /> Reportées · reviennent automatiquement
          </h2>
          <div className="space-y-3">
            {waiting.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card">
                <Link to={`/deliveries/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{d.customerName}</p>
                  <p className="text-xs text-warn-600">{scheduledMs(d) ? formatSlot(scheduledMs(d)!) : ""}</p>
                </Link>
                <Button size="sm" variant="outline" onClick={() => rescheduleDelivery(d)}>
                  Modifier
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {plan.notReady.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
            <PackageOpen className="h-5 w-5 text-ink-500" /> À charger · {plan.notReady.length}
          </h2>
          <p className="mb-3 text-sm text-ink-500">Ces colis ne sont pas encore « en cours de livraison » : ils entreront dans la tournée une fois chargés.</p>
          <div className="space-y-3">
            {plan.notReady.map((d) => (
              <DeliveryCard key={d.id} delivery={d} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3.5 text-center shadow-card">
      <p className="font-display text-lg font-bold text-ink-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
    </div>
  );
}
