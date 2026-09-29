import { Link } from "react-router-dom";
import { Route as RouteIcon, Package, CheckCircle2, Wallet, Navigation, Phone, CalendarClock, ArrowRight, Loader2, AlertCircle, BellRing, MapPinOff, Sparkles, RefreshCw, Crosshair, Clock } from "lucide-react";
import { useDeliveries } from "@/context/DeliveryContext";
import { useAuth } from "@/context/AuthContext";
import { usePlanner } from "@/context/DriverPlannerContext";
import { DeliveryCard, formatSlot } from "@/components/DeliveryCard";
import { PrecisionBadge } from "@/components/PrecisionBadge";
import { Button } from "@/components/ui/Button";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { formatDuration, formatKm, navigateUrl, scheduledMs } from "@/lib/routing";
import { formatAmount } from "@/lib/utils";

export default function Dashboard() {
  const { isLoading, error, refresh    } = useDeliveries();
  const { driver } = useAuth();
  const { plan, suggestions, driverLocation, locationError, geocodingPending, notificationPermission, enableNotifications, openReminders, deliveries } = usePlanner();
  const { callDelivery, rescheduleDelivery, sheets } = useDeliveryActions();

  const { best, alternatives } = suggestions;
  const toCollect = deliveries.filter((d)=>d.status == "delivered").reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const unlocated = plan.stops.filter((s) => s.precision === "none").length;
  const parkedCount = plan.later.length + plan.parked.length;


  const reported = deliveries.filter((d)=>d.rescheduleCount != 0);
  


  const stats = [
    { label: "Restantes", value: plan.stops.length, icon: Package, tint: "bg-brand-50 text-brand-600" },
    { label: "Livrées", value: plan.done.length, icon: CheckCircle2, tint: "bg-go-50 text-go-600" },
    { label: "Reportées", value: reported.length, icon: Clock, tint: "bg-warn-50 text-warn-600" },
    
    { label: "À encaisser", value: formatAmount(toCollect), icon: Wallet, tint: "bg-warn-50 text-warn-600" },
    { label: "Distance restante", value: formatKm(plan.totalKm), icon: RouteIcon, tint: "bg-ink-100 text-ink-700" },

  ];

  return (
    <div>
      {sheets}

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
          Bonjour{driver?.name ? `, ${driver.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-1 text-ink-500">
          {plan.stops.length > 0
            ? `${plan.stops.length} livraison(s) à faire · environ ${formatDuration(plan.totalMin)} de tournée.`
            : "Voici votre tournée du jour."}
        </p>
      </div>

      {notificationPermission === "default" && (
        <button
          onClick={enableNotifications}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-3.5 text-left"
        >
          <BellRing className="h-5 w-5 shrink-0 text-warn-600" />
          <span className="flex-1 text-sm text-ink-800">
            <span className="font-semibold">Activez les notifications</span> pour être alerté des reports et rappels de clients.
          </span>
          <ArrowRight className="h-4 w-4 text-warn-600" />
        </button>
      )}

      {isLoading && deliveries.length === 0 ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error && deliveries.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
          <Button size="sm" className="mt-4" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Réessayer
          </Button>
        </div>
      ) : (
        <>
          {/* NEXT BEST DELIVERY */}
          {best ? (
            <section className="overflow-hidden rounded-3xl bg-ink-950 text-white shadow-lift">
              <div className="p-5 sm:p-6">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-300">
                  <Sparkles className="h-3.5 w-3.5" /> Prochaine livraison conseillée
                </p>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-2xl font-bold">{best.delivery.customerName}</h2>
                    <p className="mt-1 text-sm text-ink-300">
                      {[best.delivery.address, best.delivery.delegation].filter((x) => x && x.trim()).join(" · ") || "Adresse non renseignée"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-bold">{best.legKm !== null ? formatKm(best.legKm) : "—"}</p>
                    {best.legKm !== null && <p className="text-xs text-ink-300">~{formatDuration(Math.max(1, best.etaMin))}</p>}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <PrecisionBadge precision={best.precision} />
                  {best.delivery.amount ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
                      <Wallet className="h-3 w-3" /> {formatAmount(best.delivery.amount)}
                    </span>
                  ) : null}
                </div>

                <ul className="mt-3 space-y-1 text-sm text-ink-300">
                  {best.reasons.slice(0, 3).map((r) => (
                    <li key={r} className="flex items-start gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-300" /> {r}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {navigateUrl(best.delivery) && (
                    <a href={navigateUrl(best.delivery)!} target="_blank" rel="noreferrer" className="col-span-2 sm:col-span-1">
                      <Button fullWidth>
                        <Navigation className="h-4 w-4" /> Naviguer
                      </Button>
                    </a>
                  )}
                  <Button variant="success" fullWidth onClick={() => callDelivery(best.delivery)}>
                    <Phone className="h-4 w-4" /> Appeler
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => rescheduleDelivery(best.delivery)}>
                    <CalendarClock className="h-4 w-4" /> Reporter
                  </Button>
                  <Link to={`/deliveries/${best.delivery.id}`} className="hidden sm:block">
                    <Button variant="outline" fullWidth>
                      Détails
                    </Button>
                  </Link>
                </div>
              </div>

              {alternatives.length > 0 && (
                <div className="border-t border-white/10 bg-white/5 px-5 py-3 sm:px-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-300">Aussi près de vous</p>
                  <div className="space-y-1.5">
                    {alternatives.map(({ stop, directKm }) => (
                      <Link key={stop.delivery.id} to={`/deliveries/${stop.delivery.id}`} className="flex items-center justify-between gap-3 text-sm hover:text-brand-300">
                        <span className="truncate">
                          <span className="mr-2 font-semibold">#{stop.order}</span>
                          {stop.delivery.customerName}
                        </span>
                        <span className="shrink-0 text-ink-300">{formatKm(directKm)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <NothingToDo notReady={plan.notReady.length} parked={parkedCount} total={deliveries.length} onRefresh={refresh} />
          )}

          {!driverLocation && (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-warn-500/30 bg-warn-50 p-3 text-xs text-ink-700">
              <Crosshair className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn-600" />
              {locationError ?? "Localisation en cours…"} Sans votre position, l'ordre est calculé à partir du centre de vos livraisons.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.tint}`}>
                  <s.icon className="h-4.5 w-4.5" />
                </div>
                <p className="font-display text-2xl font-bold text-ink-950">{s.value}</p>
                <p className="mt-0.5 text-xs text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>

          {(unlocated > 0 || geocodingPending > 0) && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="text-sm">
                {geocodingPending > 0 && <p className="font-semibold text-ink-900">Recherche de {geocodingPending} adresse(s) sur la carte…</p>}
                {unlocated > 0 && (
                  <p className={geocodingPending > 0 ? "mt-0.5 text-ink-500" : "font-semibold text-ink-900"}>
                    {unlocated} livraison(s) sans position connue.{" "}
                    <span className="font-normal text-ink-500">Appelez le client : elles sont placées près des autres livraisons de leur zone.</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* UPCOMING RESCHEDULES */}
          {plan.later.length + plan.parked.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Reportées · {parkedCount}</h2>
              <div className="space-y-2">
                {[...plan.later, ...plan.parked].slice(0, 4).map((d) => (
                  <Link
                    key={d.id}
                    to={`/deliveries/${d.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card hover:border-warn-500/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-50 text-warn-600">
                      <CalendarClock className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{d.customerName}</span>
                      <span className="block text-xs text-ink-500">{scheduledMs(d) ? formatSlot(scheduledMs(d)!) : ""}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-300" />
                  </Link>
                ))}
              </div>
              {openReminders.length > 0 && (
                <Link to="/reminders" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                  {openReminders.length} rappel(s) programmé(s) <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>
          )}

          {/* ROUTE PREVIEW */}
          {plan.stops.length > 1 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink-900">Ensuite dans la tournée</h2>
                <Link to="/route" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  Toute la tournée <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-3">
                {plan.stops.slice(1, 4).map((s) => (
                  <DeliveryCard key={s.delivery.id} delivery={s.delivery} stop={s} onCall={callDelivery} onReschedule={rescheduleDelivery} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NothingToDo({ notReady, parked, total, onRefresh }: { notReady: number; parked: number; total: number; onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Package className="h-6 w-6" />
      </div>
      <p className="font-display font-semibold text-ink-900">
        {total === 0 ? "Aucune livraison assignée pour l'instant" : "Rien à livrer pour le moment"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        {total === 0
          ? "Les livraisons sont créées et assignées par votre société. Elles apparaîtront ici automatiquement."
          : [
              notReady > 0 ? `${notReady} colis pas encore chargé(s) sur le camion` : "",
              parked > 0 ? `${parked} livraison(s) reportée(s)` : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Bravo, tout est livré !"}
      </p>
      <Button size="sm" variant="outline" className="mt-5" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" /> Actualiser
      </Button>
    </div>
  );
}
