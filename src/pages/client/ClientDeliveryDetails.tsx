import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Copy, MessageCircle, Clock, Wallet, StickyNote, Phone, Loader2, MapPinned, Navigation, Link2 } from "lucide-react";
import { useClientDeliveries, clientDeliveryErrorMessage } from "@/context/ClientDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/StatusBadge";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/Button";
import { formatAmount, formatDateTime, formatTime, googleMapsUrl, whatsappUrl } from "@/lib/utils";
import { ClientDelivery, clientDeliveryRecipientFullName } from "@/types";

export default function ClientDeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDelivery, fetchDelivery } = useClientDeliveries();
  const { showToast } = useToast();

  const cached = id ? getDelivery(id) : undefined;
  const [delivery, setDelivery] = useState<ClientDelivery | undefined>(cached);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => setDelivery(cached), [cached]);

  useEffect(() => {
    if (!id || cached) return;
    let cancelled = false;
    setLoading(true);
    fetchDelivery(id)
      .then((d) => !cancelled && setDelivery(d))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
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
        <Link to="/client/deliveries" className="mt-5 inline-block">
          <Button variant="outline">Retour aux livraisons</Button>
        </Link>
      </div>
    );
  }

  const hasLocation = delivery.customerLatitude != null && delivery.customerLongitude != null;
  const hasLink = delivery.hasValidationLink && !!delivery.shareUrl;
  const fullLink = hasLink ? `${window.location.origin}${delivery.shareUrl}` : "";
  const message = `🚚 Une livraison est en route pour vous.\nOuvrez ce lien et partagez votre position :\n${fullLink}`;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink-950">{clientDeliveryRecipientFullName(delivery)}</h1>
            <StatusBadge status={delivery.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {delivery.id} {delivery.reference && `· réf. ${delivery.reference}`} · créée à {formatTime(delivery.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* MAP */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-ink-100 shadow-card">
            <div className="h-72 sm:h-96">
              {hasLocation ? (
                <MapView customer={{ lat: delivery.customerLatitude!, lon: delivery.customerLongitude! }} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-50 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warn-50 text-warn-500">
                    <Clock className="h-6 w-6" />
                  </div>
                  <p className="font-display font-semibold text-ink-900">Position du destinataire inconnue</p>
                  <p className="max-w-sm text-sm text-ink-500">
                    {hasLink
                      ? "Le destinataire n'a pas encore ouvert le lien ou partagé sa position."
                      : "Aucun lien de validation n'a été généré pour cette livraison."}
                  </p>
                  {hasLink && (
                    <a href={whatsappUrl(delivery.recipientPhone1, message)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4" /> Relancer sur WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {hasLocation && (
            <a href={googleMapsUrl(delivery.customerLatitude!, delivery.customerLongitude!)} target="_blank" rel="noreferrer">
              <Button fullWidth size="lg">
                <Navigation className="h-4.5 w-4.5" /> Ouvrir dans Google Maps
              </Button>
            </a>
          )}
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Phone} label="Téléphone 1" value={delivery.recipientPhone1 || "—"} />
              {delivery.recipientPhone2 && <Row icon={Phone} label="Téléphone 2" value={delivery.recipientPhone2} />}
              <Row icon={MapPinned} label="Adresse" value={delivery.address} />
              {delivery.helpText && <Row icon={StickyNote} label="Aide pour trouver" value={delivery.helpText} />}
              {delivery.amount !== undefined && <Row icon={Wallet} label="Montant à encaisser" value={formatAmount(delivery.amount)} />}
              <Row icon={Clock} label="Créée le" value={formatDateTime(delivery.createdAt)} />
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
              <Link2 className="h-4 w-4 text-ink-400" /> Lien de validation
            </h2>
            {hasLink ? (
              <>
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
                  <a href={whatsappUrl(delivery.recipientPhone1, message)} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="success" fullWidth onClick={() => showToast("WhatsApp ouvert", "info")}>
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </a>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-500">Aucun lien de validation n'a été généré pour cette livraison.</p>
            )}
          </div>
        </div>
      </div>
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
