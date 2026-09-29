import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Navigation, CheckCircle2, MessageCircle, Clock, Wallet, StickyNote, Phone, Loader2, AlertTriangle,
  CalendarClock, MapPin, PhoneCall, BellRing, Check, MapPinned, PhoneOff,
  FileQuestion,
  Box,
} from "lucide-react";
import Pusher from "pusher-js";
import { useDeliveries, deliveryErrorMessage } from "@/context/DeliveryContext";
import { usePlanner } from "@/context/DriverPlannerContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/StatusBadge";
import { PrecisionBadge } from "@/components/PrecisionBadge";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/Button";
import { formatSlot } from "@/components/DeliveryCard";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { distanceKm, formatAmount, formatDateTime, formatTime, whatsappUrl } from "@/lib/utils";
import { addressText, formatDuration, navigateUrl, resolvePoint, scheduledMs } from "@/lib/routing";
import { formatPhone, getPhones, telUrl, waNumber } from "@/lib/phone";
import { CALL_OUTCOME_LABELS, Delivery } from "@/types";

const PUSHER_KEY = (import.meta.env.VITE_PUSHER_KEY as string) || "e43e09207961f9d8d94e";
const PUSHER_CLUSTER = (import.meta.env.VITE_PUSHER_CLUSTER as string) || "ap2";

export default function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchDelivery, markDelivered } = useDeliveries();
  const { deliveries, plan, driverLocation, locationError: driverLocationError, callsFor, openReminders, completeReminder } = usePlanner();
  const { showToast } = useToast();
  const { callDelivery, rescheduleDelivery, sheets } = useDeliveryActions();

  const cached = id ? deliveries.find((d) => d.id === id) : undefined;
  const [fetched, setFetched] = useState<Delivery | undefined>();
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const delivery = cached ?? fetched;

  // Deep link / notification click on a delivery we don't have yet.
  useEffect(() => {
    if (!id || cached) return;
    let cancelled = false;
    setLoading(true);
    fetchDelivery(id)
      .then((d) => !cancelled && setFetched(d))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live: customer shared their position.
  useEffect(() => {
    if (!id) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER, forceTLS: true });
    const channelName = `delivery-${id}`;
    const channel = pusher.subscribe(channelName);
    channel.bind("NEW-LOCATION", () => {
      fetchDelivery(id).catch(() => undefined);
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !delivery) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!delivery || notFound) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">Livraison introuvable</p>
        <p className="mt-1 text-ink-500">Cette livraison n'existe pas ou ne vous est pas assignée.</p>
        <Link to="/deliveries" className="mt-5 inline-block">
          <Button variant="outline">Retour aux livraisons</Button>
        </Link>
      </div>
    );
  }

  const d = delivery;
  const phones = getPhones(d);
  const { point, precision } = resolvePoint(d);
  const stop = plan.stops.find((s) => s.delivery.id === d.id);
  const nav = navigateUrl(d);
  const slot = scheduledMs(d);
  const done = d.status === "delivered";
  const calls = callsFor(d);
  const myReminders = openReminders.filter((r) => r.deliveryId === d.id);
  const distance = point && driverLocation ? distanceKm(driverLocation.lat, driverLocation.lon, point.lat, point.lon) * 1.3 : undefined;
  const failedCalls = calls.filter((c) => c.outcome === "no_answer" || c.outcome === "wrong_number").length;
  const fullLink = d.shareUrl ? `${window.location.origin}${d.shareUrl}` : "";
  const askPosition = `🚚 Bonjour ${d.customerName}, je suis votre livreur. Ouvrez ce lien et partagez votre position pour que je vous trouve :\n${fullLink}`;

  async function handleConfirmDelivered() {
    setDelivering(true);
    try {
      await markDelivered(d.id);
      showToast("Livraison marquée comme livrée", "success");
      setConfirmDeliver(false);
    } catch (err) {
      showToast(deliveryErrorMessage(err), "warning");
    } finally {
      setDelivering(false);
    }
  }

  return (
    <div>
      {sheets}
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold text-ink-950">{d.customerName}</h1>
          <StatusBadge status={d.status} />
          {!done && <PrecisionBadge precision={precision} />}
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {d.id} {d.reference && `· réf. ${d.reference}`} · créée à {formatTime(d.createdAt)}
          {stop && ` · arrêt n°${stop.order} de la tournée`}
        </p>
      </div>

      {slot && !done && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-4">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-warn-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink-900">Reportée · {formatSlot(slot)}</p>
            <p className="text-sm text-ink-600">
              {d.rescheduleReason ? `${d.rescheduleReason} · ` : ""}
              {d.rescheduleCount ? `${d.rescheduleCount} report(s)` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => rescheduleDelivery(d)}>
            Modifier
          </Button>
        </div>
      )}

      {/* PRIMARY ACTIONS */}
      {!done && (
        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Button variant="success" size="lg" fullWidth onClick={() => callDelivery(d)} className="col-span-2 sm:col-span-1">
            <Phone className="h-5 w-5" /> Appeler
          </Button>
          {nav ? (
            <a href={nav} target="_blank" rel="noreferrer" className="col-span-2 sm:col-span-1">
              <Button size="lg" fullWidth>
                <Navigation className="h-5 w-5" /> Naviguer
              </Button>
            </a>
          ) : (
            <Button size="lg" fullWidth disabled className="col-span-2 sm:col-span-1">
              <Navigation className="h-5 w-5" /> Pas d'adresse
            </Button>
          )}
          <Button variant="outline" size="lg" fullWidth onClick={() => rescheduleDelivery(d)}>
            <CalendarClock className="h-5 w-5" /> Reporter
          </Button>
          {confirmDeliver ? (
            <div className="flex gap-2">
              <Button variant="success" fullWidth size="lg" disabled={delivering} onClick={handleConfirmDelivered}>
                {delivering ? "…" : "Confirmer"}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDeliver(false)} disabled={delivering}>
                Non
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="lg" fullWidth onClick={() => setConfirmDeliver(true)}>
              <CheckCircle2 className="h-5 w-5" /> Livrée
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {/* MAP or address fallback */}
          <div className="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
            {point ? (
              <>
                <div className="h-64 sm:h-80" style={{zIndex:0}}>
                  <MapView driver={driverLocation ?? undefined} customer={point} />
                </div>
                {precision !== "exact" && (
                  <p className="border-t border-ink-100 bg-warn-50 px-4 py-2.5 text-xs text-ink-700">
                    Position {precision === "zone" ? "approximative (centre de la zone)" : "estimée à partir de l'adresse"} — confirmez avec le client avant de
                    vous déplacer.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 bg-ink-50 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <MapPinned className="h-6 w-6" />
                </div>
                <p className="font-display font-semibold text-ink-900">Position GPS inconnue</p>
                <p className="max-w-sm text-sm text-ink-500">
                  Appelez le client pour confirmer l'adresse, ou envoyez-lui le lien pour qu'il partage sa position.
                </p>
                {fullLink && waNumber(phones.primary) && (
                  <a href={whatsappUrl(waNumber(phones.primary), askPosition)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4" /> Demander la position sur WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>

          {point && (
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Distance route" value={distance !== undefined ? `${distance.toFixed(1)} km` : "—"} />
              <StatBox label="Temps estimé" value={distance !== undefined ? formatDuration(Math.max(1, Math.round((distance / 24) * 60))) : "—"} />
              <StatBox label="Ordre tournée" value={stop ? `#${stop.order}` : "—"} />
            </div>
          )}

          {point && !driverLocation && (
            <div className="flex items-start gap-2 rounded-xl border border-warn-500/30 bg-warn-50 p-3 text-sm text-ink-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
              <p>{driverLocationError || "Localisation en cours… autorisez la géolocalisation pour voir la distance."}</p>
            </div>
          )}

          {/* CALL HISTORY */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-ink-900">
              <PhoneCall className="h-4 w-4 text-ink-400" /> Historique des appels
              {failedCalls > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">{failedCalls} sans succès</span>}
            </h2>
            {calls.length === 0 ? (
              <p className="text-sm text-ink-500">Aucun appel enregistré.</p>
            ) : (
              <ol className="space-y-4">
                {[...calls].reverse().map((c, i, arr) => (
                  <li key={c.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-brand-600" : "bg-ink-300"}`} />
                      {i !== arr.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                    </div>
                    <div className="pb-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                        {(c.outcome === "no_answer" || c.outcome === "wrong_number") && <PhoneOff className="h-3.5 w-3.5 text-red-500" />}
                        {CALL_OUTCOME_LABELS[c.outcome]}
                      </p>
                      {c.note && <p className="text-xs text-ink-500">{c.note}</p>}
                      <p className="text-xs text-ink-400">
                        {formatDateTime(c.timestamp)}
                        {c.phoneUsed && ` · numéro ${c.phoneUsed === "primary" ? "principal" : "secondaire"}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* SIDE */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Box} label="Désignation" value={d.designation} />
              <Row icon={MapPin} label="Adresse" value={addressText(d).replace(", Tunisie", "") || "—"} />
              {d.notes && <Row icon={FileQuestion} label="Notes" value={d.notes} />}
              <Row icon={Wallet} label="Montant à encaisser" value={formatAmount(d.amount)} />
              <Row icon={Clock} label="Créée le" value={formatDateTime(d.createdAt)} />
              
            </dl>
          </div>

          
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Contact</h2>
            <dl className="space-y-3 text-sm">
              <PhoneRow label="Téléphone principal" number={phones.primary} />
              {phones.secondary && <PhoneRow label="Téléphone secondaire" number={phones.secondary} />}
            </dl>
          </div>

          
          {myReminders.length > 0 && (
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
                <BellRing className="h-4 w-4 text-warn-600" /> Rappels
              </h2>
              <ul className="space-y-2.5">
                {myReminders.map((r) => (
                  <li key={r.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{r.label}</p>
                      <p className="text-xs text-ink-500">{formatSlot(Date.parse(r.at))}</p>
                    </div>
                    <button
                      onClick={() => completeReminder(r.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-go-600 ring-1 ring-ink-200"
                      aria-label="Marquer comme traité"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhoneRow({ label, number }: { label: string; number: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Phone className="h-4 w-4 shrink-0 text-ink-400" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="font-medium text-ink-900">{formatPhone(number)}</dd>
      </div>
      {number && (
        <a href={telUrl(number)} className="rounded-lg bg-go-50 px-3 py-1.5 text-xs font-semibold text-go-600 hover:bg-go-500 hover:text-white">
          Appeler
        </a>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3.5 text-center shadow-card">
      <p className="font-display text-lg font-bold text-ink-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
      <div>
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="font-medium text-ink-900">{value}</dd>
      </div>
    </div>
  );
}
