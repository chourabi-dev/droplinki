import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, MessageCircle, CalendarPlus, BellRing, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { usePlanner } from "@/context/DriverPlannerContext";
import { Delivery } from "@/types";
import { getPhones, waNumber, formatPhone } from "@/lib/phone";
import { downloadRescheduleIcs } from "@/lib/ics";
import { addressText } from "@/lib/routing";
import { whatsappUrl, cn } from "@/lib/utils";

const REASONS = ["Client absent / indisponible", "Le client demande un autre créneau", "Adresse à confirmer", "Autre"];
const REMIND_OPTIONS = [
  { min: 0, label: "À l'heure" },
  { min: 15, label: "15 min avant" },
  { min: 30, label: "30 min avant" },
  { min: 60, label: "1 h avant" },
];

interface Preset {
  label: string;
  date: Date;
}

function at(base: Date, dayOffset: number, h: number, m = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function buildPresets(now: Date): Preset[] {
  const inMin = (n: number) => {
    const d = new Date(now.getTime() + n * 60_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  };
  const list: Preset[] = [
    { label: "Dans 1 h", date: inMin(60) },
    { label: "Dans 2 h", date: inMin(120) },
    { label: "Cet après-midi · 16:00", date: at(now, 0, 16) },
    { label: "Ce soir · 18:30", date: at(now, 0, 18, 30) },
    { label: "Demain · 09:00", date: at(now, 1, 9) },
    { label: "Demain · 14:00", date: at(now, 1, 14) },
    { label: "Après-demain · 09:00", date: at(now, 2, 9) },
  ];
  // only future slots, at least 30 min away, and no duplicates
  const seen = new Set<number>();
  return list.filter((p) => {
    const t = p.date.getTime();
    if (t < now.getTime() + 30 * 60_000 || seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fmtFull = (d: Date) =>
  d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
  " à " +
  d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
}

/**
 * The customer can't make it: pick a new slot, set the reminder, and
 * (optionally) warn the customer / add a calendar alarm.
 */
export function RescheduleSheet({ delivery, onClose }: Props) {
  const { reschedule, notificationPermission, enableNotifications } = usePlanner();
  const [now] = useState(() => new Date());
  const presets = useMemo(() => buildPresets(now), [now]);
  const [chosen, setChosen] = useState<Date | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [remindBefore, setRemindBefore] = useState(15);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ synced: boolean; when: Date; remindBefore: number } | null>(null);

  useEffect(() => {
    if (delivery) {
      setChosen(null);
      setReason(REASONS[0]);
      setRemindBefore(15);
      setNote("");
      setResult(null);
    }
  }, [delivery?.id]);

  if (!delivery) return null;
  const d = delivery;
  const phones = getPhones(d);

  async function confirm() {
    if (!chosen) return;
    setSaving(true);
    const res = await reschedule(d, { scheduledFor: chosen, reason, note: note.trim() || undefined, remindBeforeMin: remindBefore });
    setSaving(false);
    setResult({ synced: res.synced, when: chosen, remindBefore });
  }

  // ---- success screen ---------------------------------------------------
  if (result) {
    const msg = `Bonjour ${d.customerName}, votre livraison ${d.id} est reportée au ${fmtFull(result.when)}. Merci de confirmer votre disponibilité.`;
    return (
      <BottomSheet open onClose={onClose} title="Livraison reportée" subtitle={d.customerName}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-go-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-go-600" />
            <div>
              <p className="font-semibold capitalize text-ink-900">{fmtFull(result.when)}</p>
              <p className="mt-0.5 text-sm text-ink-600">
                Rappel {result.remindBefore ? `${result.remindBefore} min avant` : "à l'heure"} programmé. La livraison revient
                automatiquement dans votre tournée à ce moment-là.
              </p>
              {!result.synced && (
                <p className="mt-1 text-xs text-warn-600">Enregistré sur cet appareil — envoi au serveur en attente (réessai automatique).</p>
              )}
            </div>
          </div>

          {waNumber(phones.primary) && (
            <a href={whatsappUrl(waNumber(phones.primary), msg)} target="_blank" rel="noreferrer" className="block">
              <Button variant="success" fullWidth>
                <MessageCircle className="h-4 w-4" /> Prévenir le client sur WhatsApp
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            fullWidth
            onClick={() =>
              downloadRescheduleIcs({
                deliveryId: d.id,
                customerName: d.customerName,
                when: result.when,
                address: addressText(d),
                phone: formatPhone(phones.primary),
                remindBeforeMin: result.remindBefore,
              })
            }
          >
            <CalendarPlus className="h-4 w-4" /> Ajouter au calendrier (alarme même app fermée)
          </Button>
          {notificationPermission === "default" && (
            <Button variant="outline" fullWidth onClick={enableNotifications}>
              <BellRing className="h-4 w-4" /> Activer les notifications
            </Button>
          )}
          <Button fullWidth onClick={onClose}>
            Terminé
          </Button>
        </div>
      </BottomSheet>
    );
  }

  // ---- form -------------------------------------------------------------
  return (
    <BottomSheet open onClose={onClose} title="Reporter la livraison" subtitle={`${d.customerName} · ${d.id}`}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Nouveau créneau</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const active = chosen?.getTime() === p.date.getTime();
              return (
                <button
                  key={p.label}
                  onClick={() => setChosen(p.date)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-brand-600 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-sm font-medium text-ink-700">
            Ou choisir une date précise
            <input
              type="datetime-local"
              min={toLocalInput(now)}
              value={chosen ? toLocalInput(chosen) : ""}
              onChange={(e) => e.target.value && setChosen(new Date(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
          {chosen && <p className="mt-2 text-sm font-semibold capitalize text-brand-700">{fmtFull(chosen)}</p>}
        </div>

        <label className="block text-sm font-medium text-ink-700">
          Motif
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-700">
            <BellRing className="h-4 w-4 text-warn-600" /> Me rappeler
          </p>
          <div className="flex flex-wrap gap-2">
            {REMIND_OPTIONS.map((o) => (
              <button
                key={o.min}
                onClick={() => setRemindBefore(o.min)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  remindBefore === o.min ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="Note (optionnel)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. le client sera à la maison après 17h" />

        <Button fullWidth size="lg" disabled={!chosen || saving} onClick={confirm}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Confirmer le report
        </Button>
      </div>
    </BottomSheet>
  );
}
