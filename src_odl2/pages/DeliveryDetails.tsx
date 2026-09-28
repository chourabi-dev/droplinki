import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Copy,
  MessageCircle,
  Clock,
  Wallet,
  StickyNote,
  Phone,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useDeliveries, deliveryErrorMessage } from "@/context/DeliveryContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/StatusBadge";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/Button";
import { distanceKm, estimateMinutes, formatAmount, formatDateTime, formatTime, googleMapsUrl, whatsappUrl } from "@/lib/utils";
import { Delivery } from "@/types";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import pusher from "pusher-js";
import Pusher from "pusher-js";

export default function DeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDelivery, fetchDelivery, markDelivered } = useDeliveries();
  const { showToast } = useToast();
  // The driver's real position must come from the browser's geolocation API
  // (this device is the driver's device), never from the delivery's static
  // driverLatitude/driverLongitude fields.
  const { location: driverLocation, error: driverLocationError, loading: driverLocationLoading } = useLiveLocation();
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const cached = id ? getDelivery(id) : undefined;
  const [delivery, setDelivery] = useState<Delivery | undefined>(cached);



  

  useEffect(() => {
    // we need to subscribe to this delevery id

    const pusher = new Pusher(
        "e43e09207961f9d8d94e",
        {
            cluster: "ap2",
            forceTLS: true,
        }
    );
    const deliveryChannelID = `delivery-${id}`
    const channel = pusher.subscribe(deliveryChannelID);

    channel.bind("NEW-LOCATION", (data:any) => {
        console.log("NEW DELIVERY:", data);

        if ( id != null ){
            setLoading(true);
          fetchDelivery(id)
          .then((d) => {
             setDelivery(d);
          })
          .catch(() => {
             setNotFound(true);
          })
          .finally(() => {
             setLoading(false);
          });
        }
        
        
    });

  }, []);





  useEffect(() => {
    setDelivery(cached);
  }, [cached]);

  useEffect(() => {
    if (!id || cached) return;
    let cancelled = false;
    setLoading(true);
    fetchDelivery(id)
      .then((d) => {
        if (!cancelled) setDelivery(d);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
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
        <p className="mt-1 text-ink-500">Cette livraison n'existe pas ou plus.</p>
        <Link to="/deliveries" className="mt-5 inline-block">
          <Button variant="outline">Retour aux livraisons</Button>
        </Link>
      </div>
    );
  }

const hasLocation =
  delivery.customerLatitude != null &&
  delivery.customerLongitude != null;
  const distance =
    hasLocation && driverLocation
      ? distanceKm(driverLocation.lat, driverLocation.lon, delivery.customerLatitude!, delivery.customerLongitude!)
      : undefined;
  const eta = distance !== undefined ? estimateMinutes(distance) : undefined;
  const fullLink = `${window.location.origin}${delivery.shareUrl}`;
  const message = `🚚 Votre livraison est en route.\nOuvrez ce lien et partagez votre position avec votre livreur :\n${fullLink}`;

  async function handleConfirmDelivered() {
    setDelivering(true);
    try {
      await markDelivered(delivery!.id);
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
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink-950">{delivery.customerName}</h1>
            <StatusBadge status={delivery.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {delivery.id} {delivery.reference && `· réf. ${delivery.reference}`} · créée à {formatTime(delivery.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* MAP + primary actions */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
            <div className="h-72 sm:h-96">
              {hasLocation ? (
                <MapView
                  driver={driverLocation ?? undefined}
                  customer={{ lat: delivery.customerLatitude!, lon: delivery.customerLongitude! }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-50 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-50 text-warn-500">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="font-display font-semibold text-ink-900">En attente de la position du client</p>
                  <p className="max-w-sm text-sm text-ink-500">
                    Le client n'a pas encore ouvert le lien ou pas encore partagé sa position.
                  </p>
                  <a href={whatsappUrl(delivery.customerPhone, message)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4" /> Relancer sur WhatsApp
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>

          {hasLocation && (
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Distance" value={distance !== undefined ? `${distance.toFixed(1)} km` : "—"} />
              <StatBox label="Temps estimé" value={eta !== undefined ? `${eta} min` : "—"} />
              <StatBox
                label="Coordonnées"
                value={`${delivery.customerLatitude!.toFixed(4)}, ${delivery.customerLongitude!.toFixed(4)}`}
                small
              />
            </div>
          )}

          {hasLocation && !driverLocation && (
            <div className="flex items-start gap-2 rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm text-warn-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {driverLocationLoading
                  ? "Localisation de votre position en cours..."
                  : driverLocationError || "Position indisponible. Autorisez la géolocalisation pour voir la distance et votre position sur la carte."}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {hasLocation && (
              <a
                href={googleMapsUrl(delivery.customerLatitude!, delivery.customerLongitude!)}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button fullWidth size="lg">
                  <Navigation className="h-4.5 w-4.5" /> Ouvrir dans Google Maps
                </Button>
              </a>
            )}
            {delivery.status !== "delivered" && hasLocation && (
              <>
                {confirmDeliver ? (
                  <div className="flex flex-1 gap-2">
                    <Button variant="success" fullWidth disabled={delivering} onClick={handleConfirmDelivered}>
                      {delivering ? "Confirmation..." : "Confirmer"}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDeliver(false)} disabled={delivering}>
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="lg" onClick={() => setConfirmDeliver(true)}>
                    <CheckCircle2 className="h-4.5 w-4.5" /> Marquer comme livrée
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Phone} label="Téléphone du client" value={delivery.customerPhone || "—"} />
              <Row icon={Wallet} label="Montant à encaisser" value={formatAmount(delivery.amount)} />
              <Row icon={Clock} label="Créée le" value={formatDateTime(delivery.createdAt)} />
              {delivery.notes && <Row icon={StickyNote} label="Notes" value={delivery.notes} />}
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-3 font-display font-semibold text-ink-900">Lien client</h2>
            <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
              <p className="flex-1 truncate text-xs font-medium text-ink-700">{fullLink}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(fullLink);
                  showToast("Lien copié", "success");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copier
              </Button>
              <a href={whatsappUrl(delivery.customerPhone, message)} target="_blank" rel="noreferrer">
                <Button size="sm" variant="success" fullWidth onClick={() => showToast("WhatsApp ouvert", "info")}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Historique</h2>
            <ol className="space-y-4">
              {delivery.timeline.map((event, i) => (
                <li key={event.id} className="relative flex gap-3 pl-0.5">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === delivery.timeline.length - 1 ? "bg-brand-600" : "bg-ink-300"}`} />
                    {i !== delivery.timeline.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium text-ink-900">{event.label}</p>
                    <p className="text-xs text-ink-500">{formatTime(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-3.5 text-center shadow-card">
      <p className={small ? "font-display text-sm font-bold text-ink-950" : "font-display text-lg font-bold text-ink-950"}>{value}</p>
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
