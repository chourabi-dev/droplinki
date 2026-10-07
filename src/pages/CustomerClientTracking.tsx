import { useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Package, Truck, ShieldCheck, CheckCircle2, Loader2, Send, History } from "lucide-react";
import { clientDeliveriesPublicApi } from "@/lib/clientApi";
import { ApiError } from "@/lib/api";
import { MapView } from "@/components/MapView";
import { LocationPicker, LatLon } from "@/components/LocationPicker";
import { JournalTimeline } from "@/components/JournalTimeline";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { ClientDelivery, clientDeliveryRecipientFullName } from "@/types";
import { formatAmount, formatDateTime } from "@/lib/utils";
import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";

/** The recipient already provided a location: `locationReceivedAt` is set and coordinates exist. */
function hasProvidedLocation(d: ClientDelivery): boolean {
  return !!d.locationReceivedAt && d.customerLatitude != null && d.customerLongitude != null;
}

type ViewState = "loading" | "not_found" | "form" | "submitting" | "shared";

export default function CustomerClientTracking() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const { showToast } = useToast();

  const [delivery, setDelivery] = useState<ClientDelivery | null>(null);
  const [state, setState] = useState<ViewState>("loading");
  const [pin, setPin] = useState<LatLon | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await clientDeliveriesPublicApi.getPublic(deliveryId);
        if (cancelled) return;
        setDelivery(data);
        // Location already provided by the recipient -> read-only map (no relocating).
        // Otherwise (locationReceivedAt is null) the pin-picking form is kept as is.
        const locationProvided = hasProvidedLocation(data);
        if (!locationProvided && data.customerLatitude != null && data.customerLongitude != null) {
          setPin({ lat: data.customerLatitude, lon: data.customerLongitude });
        }
        setState(locationProvided || data.status === "location_received" || data.status === "delivered" ? "shared" : "form");
        // best-effort: let the client (Expéditeur) know the recipient opened the link
        clientDeliveriesPublicApi.markLinkOpened(deliveryId).catch(() => {});
      } catch {
        if (!cancelled) setState("not_found");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deliveryId]);

  async function confirmLocation() {
    if (!deliveryId || !pin) return;
    setState("submitting");
    setSubmitError(null);
    try {
      const updated = await clientDeliveriesPublicApi.shareLocation(deliveryId, pin.lat, pin.lon);
      setDelivery(updated);
      setState("shared");
      showToast("Position envoyée au livreur.", "success");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Impossible d'envoyer votre position. Réessayez.");
      setState("form");
    }
  }

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
          Ce lien de livraison n'existe pas ou a peut-être expiré. Contactez l'expéditeur pour un nouveau lien.
        </p>
      </CenteredShell>
    );
  }

  const journal = delivery.journal ?? [];

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} width={250} />
        </div>

        <div className="flex-1 rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
          <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Commande</dt>
                  <dd className="font-medium text-ink-900">#{delivery.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-500">Contenu</dt>
                  <dd className="font-medium text-ink-900">{delivery.designation}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="shrink-0 text-ink-500">Adresse</dt>
                  <dd className="text-right font-medium text-ink-900">
                    {delivery.address}
                    {(delivery.delegationName || delivery.governorateName) && (
                      <>
                        <br />
                        <span className="text-ink-500">
                          {[delivery.delegationName, delivery.governorateName].filter(Boolean).join(", ")}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                {delivery.helpText && (
                  <div className="flex justify-between gap-6">
                    <dt className="shrink-0 text-ink-500">Indications</dt>
                    <dd className="text-right font-medium text-ink-900">{delivery.helpText}</dd>
                  </div>
                )}
                {!!delivery.amount && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">À payer</dt>
                    <dd className="font-medium text-ink-900">{formatAmount(delivery.amount +  delivery.deliveryFees  )}</dd>
                  </div>
                )}
              </dl>
              
          
          {state === "shared" ? (
            <SharedState delivery={delivery} />
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-800">
                    Colis pour {clientDeliveryRecipientFullName(delivery)}
                  </p>
                  <p className="text-xs text-brand-600">Aidez le livreur à vous trouver précisément</p>
                </div>
              </div>

              

              <div className="mt-7">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  <h2 className="font-display text-base font-bold text-ink-950">Indiquez votre position exacte</h2>
                </div>
                <p className="mb-3 text-sm text-ink-500">
                  Recherchez votre adresse ou touchez la carte pour placer le repère à l'endroit exact où le livreur
                  doit venir.
                </p>

                <LocationPicker value={pin} onChange={setPin} />

                {submitError && (
                  <p className="mt-3 rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm text-warn-700">
                    {submitError}
                  </p>
                )}

                <Button
                  fullWidth
                  size="lg"
                  className="mt-5"
                  onClick={confirmLocation}
                  disabled={!pin || state === "submitting"}
                >
                  {state === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Confirmer ma position
                </Button>
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-ink-50 p-3.5 text-xs text-ink-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <p>Nous utilisons votre position uniquement pour aider le livreur à vous trouver. Elle n'est pas conservée après la livraison.</p>
              </div>
            </>
          )}
        </div>

        {journal.length > 0 && (
          <div className="mt-5 rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <History className="h-4 w-4 text-brand-600" />
              <h2 className="font-display text-base font-bold text-ink-950">Journal du colis</h2>
            </div>
            <JournalTimeline entries={journal} />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink-400 m-auto">All rights reserved | PowredBy</p>
        <p className="text-center text-xs text-ink-400 m-auto">
          <a href="https://www.chourabi-e-business-solutions.com/" target="_blank">
            <img src={cebs} width={100} />
          </a>
        </p>
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

function SharedState({ delivery }: { delivery: ClientDelivery }) {
  const hasCoords = delivery.customerLatitude != null && delivery.customerLongitude != null;
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-go-50 text-go-500 animate-check-pop">
          <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold text-ink-950">Position partagée !</h1>
        <p className="mt-1.5 text-sm text-ink-500">Le livreur a votre position exacte.</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-go-50 px-3 py-1 text-xs font-semibold text-go-600">
          <span className="h-1.5 w-1.5 rounded-full bg-go-500" /> Position reçue
          {delivery.locationReceivedAt && <> · {formatDateTime(delivery.locationReceivedAt)}</>}
        </span>
      </div>

      {hasCoords && (
        <div className="mt-5 h-64 overflow-hidden rounded-2xl border border-ink-100">
          <MapView
            customer={{ lat: delivery.customerLatitude!, lon: delivery.customerLongitude! }}
            interactive={false}
            zoom={15}
          />
        </div>
      )}
    </div>
  );
}
