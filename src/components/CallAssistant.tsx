import { useEffect, useRef, useState } from "react";
import { Phone, PhoneCall, PhoneOff, Copy, MessageCircle, CalendarClock, CheckCircle2, HelpCircle, BellRing, Loader2, PhoneForwarded } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";
import { usePlanner } from "@/context/DriverPlannerContext";
import { Delivery, CallOutcome } from "@/types";
import { formatPhone, getPhones, telUrl, waNumber } from "@/lib/phone";
import { whatsappUrl } from "@/lib/utils";

type Which = "primary" | "secondary";
type Step = "dial" | "outcome" | "next";

const OUTCOMES: { outcome: CallOutcome; label: string; hint: string; icon: typeof Phone; tone: string }[] = [
  { outcome: "location_confirmed", label: "Répondu · adresse confirmée", hint: "Le client est prêt à recevoir", icon: CheckCircle2, tone: "text-go-600 bg-go-50" },
  { outcome: "answered_no_location", label: "Répondu · adresse à préciser", hint: "Indications à noter", icon: HelpCircle, tone: "text-brand-700 bg-brand-50" },
  { outcome: "reschedule_requested", label: "Répondu · demande un report", hint: "Choisir un nouveau créneau", icon: CalendarClock, tone: "text-warn-600 bg-warn-50" },
  { outcome: "no_answer", label: "Pas de réponse / occupé", hint: "Rappel automatique proposé", icon: PhoneOff, tone: "text-ink-700 bg-ink-100" },
  { outcome: "wrong_number", label: "Numéro erroné / injoignable", hint: "Essayer l'autre numéro", icon: PhoneOff, tone: "text-red-600 bg-red-50" },
];

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
  /** Called when the customer asks for a report during the call. */
  onReschedule: (d: Delivery) => void;
}

/**
 * In-app dial flow. The PRIMARY number is always dialled first; the secondary
 * number only exists in the UI when the delivery has one. After the call the
 * driver logs what happened (returning to the tab opens the outcome step by
 * itself), and the assistant proposes the next best action.
 */
export function CallAssistant({ delivery, onClose, onReschedule }: Props) {
  const { showToast } = useToast();
  const { logCall, addReminder } = usePlanner();
  const [step, setStep] = useState<Step>("dial");
  const [dialed, setDialed] = useState<Which | null>(null);
  const [tried, setTried] = useState<Which[]>([]);
  const [lastOutcome, setLastOutcome] = useState<CallOutcome | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const wasAway = useRef(false);

  // fresh state each time a delivery is opened
  useEffect(() => {
    if (delivery) {
      setStep("dial");
      setDialed(null);
      setTried([]);
      setLastOutcome(null);
      setNote("");
      setReminderSet(false);
    }
  }, [delivery?.id]);

  // Detect "came back from the phone app" -> jump to the outcome step.
  useEffect(() => {
    if (!delivery || step !== "dial" || !dialed) return;
    wasAway.current = false;
    const away = () => {
      wasAway.current = true;
    };
    const back = () => {
      if (wasAway.current && !document.hidden) setStep("outcome");
    };
    const onVis = () => (document.hidden ? away() : back());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", away);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", away);
      window.removeEventListener("focus", back);
    };
  }, [delivery, step, dialed]);

  if (!delivery) return null;
  const d = delivery;
  const phones = getPhones(d);
  const number = (w: Which) => (w === "primary" ? phones.primary : phones.secondary ?? "");

  async function submit(outcome: CallOutcome) {
    if (!dialed) return;
    setSaving(true);
    const res = await logCall(d, { outcome, phoneUsed: dialed, note: note.trim() || undefined });
    setSaving(false);
    showToast(res.synced ? "Appel enregistré" : "Appel enregistré sur cet appareil (synchro en attente)", res.synced ? "success" : "info");
    setLastOutcome(outcome);
    setTried((t) => (t.includes(dialed) ? t : [...t, dialed]));
    setNote("");
    if (outcome === "reschedule_requested") {
      onClose();
      onReschedule(d);
      return;
    }
    if (outcome === "location_confirmed" || outcome === "answered_no_location") {
      onClose();
      return;
    }
    setStep("next"); // no_answer / wrong_number
  }

  function setCallback(minutes: number) {
    addReminder({
      deliveryId: d.id,
      customerName: d.customerName,
      at: new Date(Date.now() + minutes * 60_000),
      label: `Rappeler ${d.customerName} (${formatPhone(phones.primary)})`,
      kind: "callback",
    });
    setReminderSet(true);
    showToast(`Rappel dans ${minutes} min`, "success");
  }

  const secondaryAvailable = !!phones.secondary;
  const secondaryUntried = secondaryAvailable && !tried.includes("secondary");
  const link = d.shareUrl ? `${d.shareUrl}` : "";
  const waMessage = `Bonjour ${d.customerName}, je suis votre livreur. J'ai essayé de vous joindre pour votre livraison ${d.id}.${
    link ? `\nMerci de partager votre position ici : ${link}` : "\nMerci de me rappeler dès que possible."
  }`;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={step === "outcome" ? "Comment s'est passé l'appel ?" : step === "next" ? "Et maintenant ?" : `Appeler ${d.customerName}`}
      subtitle={d.id}
    >
      {step === "dial" && (
        <div className="space-y-3">
          <DialRow
            label="Numéro principal"
            number={phones.primary}
            primary
            attempted={tried.includes("primary")}
            active={dialed === "primary"}
            onDial={() => setDialed("primary")}
          />
          {secondaryAvailable && (
            <DialRow
              label="Numéro secondaire (optionnel)"
              number={phones.secondary!}
              attempted={tried.includes("secondary")}
              active={dialed === "secondary"}
              onDial={() => setDialed("secondary")}
            />
          )}
          {dialed && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-3.5">
              <p className="text-sm text-brand-900">
                Appel lancé vers le {dialed === "primary" ? "numéro principal" : "numéro secondaire"}. En revenant sur l'app, vous pourrez
                enregistrer le résultat.
              </p>
              <Button size="sm" className="mt-3" fullWidth onClick={() => setStep("outcome")}>
                J'ai terminé l'appel
              </Button>
            </div>
          )}
          {!phones.primary && <p className="text-sm text-red-600">Aucun numéro principal sur cette livraison.</p>}
        </div>
      )}

      {step === "outcome" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-500">
            Numéro appelé : <span className="font-semibold text-ink-900">{dialed === "secondary" ? "secondaire" : "principal"}</span> ·{" "}
            {formatPhone(number(dialed ?? "primary"))}
          </p>
          <div className="grid gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.outcome}
                disabled={saving}
                onClick={() => submit(o.outcome)}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 text-left transition-colors hover:border-brand-200 hover:bg-ink-50 disabled:opacity-50"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${o.tone}`}>
                  <o.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">{o.label}</span>
                  <span className="block text-xs text-ink-500">{o.hint}</span>
                </span>
                {saving && <Loader2 className="h-4 w-4 animate-spin text-ink-400" />}
              </button>
            ))}
          </div>
          <Textarea label="Note (optionnel)" rows={2} placeholder="Ex. portail bleu, 2e étage…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={() => setStep("dial")} className="text-sm font-medium text-ink-500 hover:text-ink-900">
            ← Retour
          </button>
        </div>
      )}

      {step === "next" && (
        <div className="space-y-3">
          <p className="text-sm text-ink-500">
            {lastOutcome === "wrong_number" ? "Ce numéro ne fonctionne pas." : "Le client n'a pas décroché."}
          </p>

          {secondaryUntried && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
              <p className="mb-2 text-sm font-semibold text-brand-900">Un numéro secondaire est disponible</p>
              <a
                href={telUrl(phones.secondary!)}
                onClick={() => {
                  setDialed("secondary");
                  setStep("dial");
                }}
              >
                <Button fullWidth>
                  <PhoneForwarded className="h-4 w-4" /> Appeler le {formatPhone(phones.secondary)}
                </Button>
              </a>
            </div>
          )}

          {link || waNumber(phones.primary) ? (
            <a href={whatsappUrl(waNumber(phones.primary), waMessage)} target="_blank" rel="noreferrer" className="block">
              <Button variant="success" fullWidth>
                <MessageCircle className="h-4 w-4" /> {link ? "Demander la position sur WhatsApp" : "Écrire sur WhatsApp"}
              </Button>
            </a>
          ) : null}

          <div className="rounded-2xl border border-ink-100 p-3.5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <BellRing className="h-4 w-4 text-warn-600" /> Me le rappeler
            </p>
            {reminderSet ? (
              <p className="text-sm text-go-600">Rappel programmé ✓</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[10, 20, 30, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setCallback(m)}
                    className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                  >
                    {m} min
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                onClose();
                onReschedule(d);
              }}
            >
              <CalendarClock className="h-4 w-4" /> Reporter
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function DialRow({
  label,
  number,
  primary,
  attempted,
  active,
  onDial,
}: {
  label: string;
  number: string;
  primary?: boolean;
  attempted: boolean;
  active: boolean;
  onDial: () => void;
}) {
  const { showToast } = useToast();
  return (
    <div className={`rounded-2xl border p-3.5 ${primary ? "border-brand-200 bg-white" : "border-ink-100 bg-ink-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {attempted && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">déjà appelé</span>}
      </div>
      <p className="mt-1 font-display text-xl font-bold text-ink-950">{formatPhone(number)}</p>
      <div className="mt-3 flex gap-2">
        <a href={number ? telUrl(number) : undefined} onClick={onDial} className="flex-1">
          <Button fullWidth size="lg" variant={primary ? "primary" : "outline"} disabled={!number}>
            {active ? <PhoneCall className="h-5 w-5" /> : <Phone className="h-5 w-5" />} Appeler
          </Button>
        </a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(number);
            showToast("Numéro copié", "info");
          }}
          className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
          aria-label="Copier le numéro"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
