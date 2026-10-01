import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  PhoneCall,
  Loader2,
  MapPinned,  
  User2,
  X,
  Package,
  Ruler,
  Scale,
  RotateCcw,
  Ban,
  CalendarClock,
  Repeat,
  AlertTriangle,
  Banknote,
  History,
} from "lucide-react";
import { useCompanyDeliveries, companyDeliveryErrorMessage } from "@/context/CompanyDeliveryContext";
import { useCompanyDrivers } from "@/context/CompanyDriverContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/StatusBadge";
import { MapView } from "@/components/MapView";
import { JournalTimeline } from "@/components/JournalTimeline";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatAmount, formatDateTime, formatTime, googleMapsUrl, whatsappUrl } from "@/lib/utils";
import { ClientDelivery, CALL_OUTCOME_LABELS, CallOutcome, companyDriverFullName } from "@/types";

const OUTCOME_ORDER: CallOutcome[] = ["location_confirmed", "answered_no_location", "no_answer", "wrong_number"];

export default function CompanyDeliveryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDelivery, fetchDelivery, assignDriver, logCall, markDelivered } = useCompanyDeliveries();
  const { drivers } = useCompanyDrivers();
  const { showToast } = useToast();

  const cached = id ? getDelivery(id) : undefined;
  const [delivery, setDelivery] = useState<ClientDelivery | undefined>(cached);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [confirmDeliver, setConfirmDeliver] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [callPanelOpen, setCallPanelOpen] = useState(false);

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
        <Link to="/company/deliveries" className="mt-5 inline-block">
          <Button variant="outline">Retour aux livraisons</Button>
        </Link>
      </div>
    );
  }

  const hasLocation = delivery.customerLatitude != null && delivery.customerLongitude != null;
  const fullLink = `${delivery.shareUrl}`;
  const message = `🚚 Votre livraison est en route.\nOuvrez ce lien et partagez votre position avec le livreur :\n${fullLink}`;
  const assignedDriver = drivers.find((d) => d.id === delivery.assignedDriverId);

  async function handleConfirmDelivered() {
    setDelivering(true);
    try {
      await markDelivered(delivery!.id);
      showToast("Livraison marquée comme livrée", "success");
      setConfirmDeliver(false);
    } catch (err) {
      showToast(companyDeliveryErrorMessage(err), "warning");
    } finally {
      setDelivering(false);
    }
  }

  async function handleAssign(driverId: string) {
    try {
      await assignDriver(delivery!.id, driverId || null);
      showToast(driverId ? "Livreur assigné" : "Livreur retiré", "success");
    } catch (err) {
      showToast(companyDeliveryErrorMessage(err), "warning");
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-ink-950">{delivery.recipientFirstName} {delivery.recipientLastName}</h1>
            <StatusBadge status={delivery.status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {delivery.id} · créée à {formatTime(delivery.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* MAP + primary actions */}
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
                  <p className="font-display font-semibold text-ink-900">Position du client inconnue</p>
                  <p className="max-w-sm text-sm text-ink-500">
                    Le client n'a pas encore partagé sa position via le lien, ou vous ne l'avez pas encore appelé.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a href={whatsappUrl(delivery.recipientPhone1, message)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4" /> Relancer sur WhatsApp
                      </Button>
                    </a>
                    <Button size="sm" onClick={() => setCallPanelOpen(true)}>
                      <PhoneCall className="h-4 w-4" /> Appeler pour localiser
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {hasLocation && (
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Coordonnées" value={`${delivery.customerLatitude!.toFixed(4)}, ${delivery.customerLongitude!.toFixed(4)}`} small />
              <StatBox label="Livreur assigné" value={assignedDriver ? companyDriverFullName(assignedDriver) : "Aucun"} small />
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {hasLocation && (
              <a href={googleMapsUrl(delivery.customerLatitude!, delivery.customerLongitude!)} target="_blank" rel="noreferrer" className="flex-1">
                <Button fullWidth size="lg">
                  <Navigation className="h-4.5 w-4.5" /> Ouvrir dans Google Maps
                </Button>
              </a>
            )}
            <Button size="lg" variant="outline" onClick={() => setCallPanelOpen(true)}>
              <PhoneCall className="h-4.5 w-4.5" /> {hasLocation ? "Nouvel appel" : "Appeler le client"}
            </Button>
            {delivery.status !== "delivered" && delivery.status !== "CANCELED" && delivery.status !== "EN-DEP-FAILD" && hasLocation && (
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

          {delivery.status === "EN-DEP-FAILD" && (
            <FailedDeliveryDecision delivery={delivery} onUpdated={setDelivery} />
          )}

          {delivery.status === "CANCELED" && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <Ban className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Cette livraison a été annulée définitivement. Les frais de retour seront déduits du prochain versement au client.
              </p>
            </div>
          )}

          {callPanelOpen && (
            <CallPanel
              delivery={delivery}
              onClose={() => setCallPanelOpen(false)}
              onLogged={(updated) => {
                setDelivery(updated);
                setCallPanelOpen(false);
              }}
            />
          )}
          

          {/* Call log */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-ink-900">
              <PhoneCall className="h-4 w-4 text-ink-400" /> Historique des appels
            </h2>
            {(delivery.callAttempts?.length ?? 0) === 0 ? (
              <p className="text-sm text-ink-500">Aucun appel enregistré pour cette livraison.</p>
            ) : (
              <ol className="space-y-4">
                {[...delivery.callAttempts].reverse().map((call, i) => (
                  <li key={call.id} className="relative flex gap-3 pl-0.5">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-brand-600" : "bg-ink-300"}`} />
                      {i !== delivery.callAttempts.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-ink-900">{CALL_OUTCOME_LABELS[call.outcome]}</p>
                      {call.note && <p className="text-xs text-ink-500">{call.note}</p>}
                      <p className="text-xs text-ink-400">{formatDateTime(call.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Détails</h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Phone} label="Téléphone 1" value={delivery.recipientPhone1 || "—"} />
              {delivery.recipientPhone2 && <Row icon={Phone} label="Téléphone 2" value={delivery.recipientPhone2} />}
              <Row icon={MapPinned} label="Adresse" value={delivery.address} />
              {(delivery.delegationName || delivery.governorateName) && (
                <Row
                  icon={MapPinned}
                  label="Zone"
                  value={[delivery.delegationName, delivery.governorateName].filter(Boolean).join(", ")}
                />
              )}
              {delivery.helpText && <Row icon={StickyNote} label="Aide pour trouver" value={delivery.helpText} />}
              {delivery.designation && <Row icon={Package} label="Désignation" value={delivery.designation} />}
              {delivery.dimensions && <Row icon={Ruler} label="Dimensions" value={delivery.dimensions} />}
              {delivery.weight !== undefined && <Row icon={Scale} label="Poids" value={`${delivery.weight} kg`} />}
              {delivery.amount !== undefined && (
                <Row icon={Wallet} label="Montant à encaisser (hors frais de livraison)" value={formatAmount(delivery.amount)} />
              )}
              <Row icon={Clock} label="Créée le" value={formatDateTime(delivery.createdAt)} />
            </dl>
          </div>

          {/* Journal — every action recorded on the package */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
                <History className="h-4 w-4 text-ink-500" /> Journal du colis
              </h2>
              {(delivery.journal?.length ?? 0) > 0 && (
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{delivery.journal.length}</span>
              )}
            </div>
            <JournalTimeline entries={delivery.journal} />
          </div>

          {/* Reschedule / failed-attempt history */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
                <CalendarClock className="h-4 w-4 text-ink-400" /> Report &amp; reprogrammation
              </h2>
              {(delivery.rescheduleCount ?? 0) > 0 && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    (delivery.rescheduleCount ?? 0) >= 3 ? "bg-red-50 text-red-600" : "bg-warn-50 text-warn-600"
                  }`}
                >
                  {delivery.rescheduleCount}× reportée
                </span>
              )}
            </div>
            <dl className="space-y-3 text-sm">
              <Row
                icon={CalendarClock}
                label="Prochaine tentative prévue"
                value={delivery.scheduledFor ? formatDateTime(delivery.scheduledFor) : "Non planifiée"}
              />
              <Row icon={Repeat} label="Nombre de reports" value={String(delivery.rescheduleCount ?? 0)} />
              <Row
                icon={AlertTriangle}
                label="Motif du report / de l'échec"
                value={delivery.rescheduleReason?.trim() || "Aucun motif renseigné"}
              />
            </dl>
          </div>

          {delivery.paidAt && (
            <div className="flex items-start gap-3 rounded-2xl border border-go-500/20 bg-go-50 p-4 text-sm text-go-600">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Colis réglé au client le <strong>{formatDateTime(delivery.paidAt)}</strong>
                {delivery.payoutId ? ` (versement ${delivery.payoutId})` : ""}.
              </p>
            </div>
          )}


          

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink-900">
              <User2 className="h-4 w-4 text-ink-400" /> Livreur assigné
            </h2>
            <select
              value={delivery.assignedDriverId || ""}
              onChange={(e) => handleAssign(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            >
              <option value="">Non assigné</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {companyDriverFullName(d)}
                </option>
              ))}
            </select>
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
              <a href={whatsappUrl(delivery.recipientPhone1, message)} target="_blank" rel="noreferrer">
                <Button size="sm" variant="success" fullWidth onClick={() => showToast("WhatsApp ouvert", "info")}>
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The "call the client to get their location" workflow: dial, log the outcome, and — if they described their location — pin it by tapping the map. */
function CallPanel({
  delivery,
  onClose,
  onLogged,
}: {
  delivery: ClientDelivery;
  onClose: () => void;
  onLogged: (updated: ClientDelivery) => void;
}) {
  const { logCall } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [outcome, setOutcome] = useState<CallOutcome>("location_confirmed");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(
    delivery.customerLatitude != null && delivery.customerLongitude != null
      ? { lat: delivery.customerLatitude, lon: delivery.customerLongitude }
      : null
  );
  const [submitting, setSubmitting] = useState(false);


  async function handleSubmit() {
   
    setSubmitting(true);
    try {
      const updated = await logCall(delivery.id, {
        outcome,
        note: note.trim() || undefined
      });
      showToast("Appel enregistré", "success");
      onLogged(updated);
    } catch (err) {
      showToast(companyDeliveryErrorMessage(err), "warning");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
          <PhoneCall className="h-4 w-4 text-brand-600" /> Appeler {delivery.recipientFirstName}
        </h2>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-white" aria-label="Fermer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <a href={`tel:${delivery.recipientPhone1}`} className="mb-4 block">
        <Button fullWidth variant="secondary">
          <Phone className="h-4 w-4" /> Composer {delivery.recipientPhone1}
        </Button>
      </a>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Résultat de l'appel</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OUTCOME_ORDER.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  outcome === o ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                }`}
              >
                {CALL_OUTCOME_LABELS[o]}
              </button>
            ))}
          </div>
        </div>

        {/*needsPin && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Épinglez la position décrite par le client
            </label>
            <div className="h-56 overflow-hidden rounded-xl border border-ink-200">
              <MapView customer={pin ?? undefined} zoom={pin ? 15 : 12} onPick={(lat, lon) => setPin({ lat, lon })} />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              {pin ? `Position choisie : ${pin.lat.toFixed(4)}, ${pin.lon.toFixed(4)}` : "Touchez la carte à l'endroit décrit par le client."}
            </p>
          </div>
        )
        */}

        <Textarea label="Note (optionnel)" placeholder="Ex. à côté de la pharmacie, portail bleu" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

        <Button fullWidth disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Enregistrement..." : "Enregistrer l'appel"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Shown when a package could not be delivered (status EN-DEP-FAILD, back at
 * the depot). Company staff decide: launch a new delivery attempt or cancel
 * for good (which triggers the return fees at the client's next payout).
 */
function FailedDeliveryDecision({
  delivery,
  onUpdated,
}: {
  delivery: ClientDelivery;
  onUpdated: (d: ClientDelivery) => void;
}) {
  const { relaunchDelivery, cancelDelivery } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"relaunch" | "cancel" | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRelaunch() {
    setBusy(true);
    try {
      const updated = await relaunchDelivery(delivery.id, {
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        note: note.trim() || undefined,
      });
      onUpdated(updated);
      showToast("Livraison relancée", "success");
      setMode(null);
    } catch (err) {
      showToast(companyDeliveryErrorMessage(err), "warning");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      const updated = await cancelDelivery(delivery.id, note.trim() || undefined);
      onUpdated(updated);
      showToast("Livraison annulée définitivement", "success");
      setMode(null);
    } catch (err) {
      showToast(companyDeliveryErrorMessage(err), "warning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
        <AlertTriangle className="h-4 w-4 text-red-500" /> Livraison échouée — décision requise
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        Le colis est de retour au dépôt
        {(delivery.rescheduleCount ?? 0) > 0 ? ` après ${delivery.rescheduleCount} report(s)` : ""}.
        {delivery.rescheduleReason ? ` Motif : « ${delivery.rescheduleReason} ».` : ""} Relancez une nouvelle tentative
        ou annulez-le définitivement.
      </p>

      {mode === null && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => setMode("relaunch")}>
            <RotateCcw className="h-4 w-4" /> Relancer la livraison
          </Button>
          <Button className="flex-1" variant="danger" onClick={() => setMode("cancel")}>
            <Ban className="h-4 w-4" /> Annuler définitivement
          </Button>
        </div>
      )}

      {mode === "relaunch" && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4">
          <Input
            label="Nouvelle date de livraison (optionnel)"
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
          <Textarea label="Note (optionnel)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button fullWidth disabled={busy} onClick={handleRelaunch}>
              {busy ? "Relance..." : "Confirmer la relance"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode(null)}>
              Retour
            </Button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="mt-4 space-y-3 rounded-xl bg-white p-4">
          <p className="text-sm font-medium text-red-600">
            Action définitive : le colis sera retourné au client et ses frais de retour seront déduits de son prochain versement.
          </p>
          <Textarea label="Motif (optionnel)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="danger" fullWidth disabled={busy} onClick={handleCancel}>
              {busy ? "Annulation..." : "Confirmer l'annulation"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setMode(null)}>
              Retour
            </Button>
          </div>
        </div>
      )}
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
