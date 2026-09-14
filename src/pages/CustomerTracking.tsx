import { useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Truck, ShieldCheck, LocateFixed, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { deliveriesApi, ApiError } from "@/lib/api";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/Button";
import { Delivery } from "@/types";

type ShareState = "loading" | "not_found" | "idle" | "locating" | "denied" | "shared";

export default function CustomerTracking() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [state, setState] = useState<ShareState>("loading");
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await deliveriesApi.getPublic(deliveryId);
        if (cancelled) return;
        setDelivery(data);
        setState(data.status === "location_received" || data.status === "delivered" ? "shared" : "idle");
        // best-effort: let the driver know the customer opened the link
        deliveriesApi.markLinkOpened(deliveryId).catch(() => {});
      } catch {
        if (!cancelled) setState("not_found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deliveryId]);

  if (state === "loading") {
    return (
      <CenteredShell>
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        <p className="mt-4 text-sm text-ink-500">Chargement de la livraison...</p>
      </CenteredShell>
    );
  }

  if (state === "not_found" || !delivery) {
    return (
      <CenteredShell>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          <Truck className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-ink-950">Lien introuvable</h1>
        <p className="mt-1.5 max-w-xs text-sm text-ink-500">
          Ce lien de livraison n'existe pas ou a peut-être expiré. Contactez votre livreur pour un nouveau lien.
        </p>
      </CenteredShell>
    );
  }

  function requestLocation() {
    setState("locating");
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("Votre navigateur ne supporte pas la géolocalisation.");
      setState("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await deliveriesApi.shareLocation(delivery!.id, pos.coords.latitude, pos.coords.longitude);
          setDelivery(updated);
          setState("shared");
        } catch (err) {
          setLocationError(err instanceof ApiError ? err.message : "Impossible d'envoyer votre position au livreur.");
          setState("denied");
        }
      },
      () => {
        setLocationError("Position refusée ou indisponible. Autorisez la géolocalisation puis réessayez.");
        setState("denied");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapPin className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold text-ink-900">DropLink</span>
        </div>

        <div className="flex-1 rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
          {state === "shared" ? (
            <SharedState delivery={delivery} />
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-800">Votre livraison est en route</p>
                  <p className="text-xs text-brand-600">Aidez votre livreur à vous trouver</p>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Livraison de</dt>
                  <dd className="font-medium text-ink-900">Livreur DropLink</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Commande</dt>
                  <dd className="font-medium text-ink-900">#{delivery.id}</dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-col items-center text-center">
                <button
                  onClick={requestLocation}
                  disabled={state === "locating"}
                  className="group relative flex h-32 w-32 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift transition-transform active:scale-95 disabled:opacity-80"
                >
                  {state === "locating" && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/40" />
                  )}
                  <span className="relative flex flex-col items-center gap-1">
                    <LocateFixed className="h-8 w-8" />
                  </span>
                </button>
                <p className="mt-5 font-display text-lg font-bold text-ink-950">
                  {state === "locating" ? "Localisation en cours..." : "Partager ma position"}
                </p>
                <p className="mt-1 text-sm text-ink-500">Un seul tap suffit.</p>

                {state === "denied" && locationError && (
                  <div className="mt-5 w-full rounded-xl border border-warn-200 bg-warn-50 p-4 text-left">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
                      <p className="text-sm text-warn-700">{locationError}</p>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3" onClick={requestLocation}>
                      Réessayer
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-start gap-2 rounded-xl bg-ink-50 p-3.5 text-xs text-ink-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <p>Nous utilisons votre position uniquement pour aider le livreur à vous trouver. Elle n'est pas conservée après la livraison.</p>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">Propulsé par DropLink — aucune application requise</p>
      </div>
    </div>
  );
}

function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      {children}
    </div>
  );
}

function SharedState({ delivery }: { delivery: Delivery }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-go-50 text-go-500 animate-check-pop">
          <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-ink-950">Position partagée !</h1>
        <p className="mt-1.5 text-sm text-ink-500">Votre livreur a maintenant votre position exacte.</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-go-50 px-3 py-1 text-xs font-semibold text-go-600">
          <span className="h-1.5 w-1.5 rounded-full bg-go-500" /> Position reçue
        </span>
      </div>

      {delivery.customerLatitude !== undefined && delivery.customerLongitude !== undefined && (
        <div className="mt-5 h-56 overflow-hidden rounded-2xl border border-ink-100">
          <MapView customer={{ lat: delivery.customerLatitude, lon: delivery.customerLongitude }} interactive={false} zoom={15} />
        </div>
      )}

      <p className="mt-5 text-center text-sm text-ink-500">Vous pouvez fermer cette page maintenant.</p>
    </div>
  );
}
