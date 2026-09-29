import { Link } from "react-router-dom";
import { BellRing, Check, AlarmClock, BellOff, PhoneCall, CalendarClock } from "lucide-react";
import { usePlanner } from "@/context/DriverPlannerContext";
import { Button } from "@/components/ui/Button";
import { formatSlot } from "@/components/DeliveryCard";

export default function Reminders() {
  const { openReminders, completeReminder, snoozeReminder, notificationPermission, enableNotifications } = usePlanner();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Rappels</h1>
      <p className="mt-1 text-ink-500">Reports de clients et rappels d'appel. Ils sonnent tant que l'application est ouverte.</p>

      {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-4">
          <BellOff className="h-5 w-5 shrink-0 text-warn-600" />
          <p className="flex-1 text-sm text-ink-800">
            {notificationPermission === "denied"
              ? "Notifications bloquées dans le navigateur : les rappels s'affichent seulement dans l'app."
              : "Activez les notifications système pour ne rien manquer."}
          </p>
          {notificationPermission === "default" && (
            <Button size="sm" onClick={enableNotifications}>
              Activer
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {openReminders.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
            <BellRing className="mb-3 h-8 w-8 text-ink-300" />
            <p className="font-display font-semibold text-ink-900">Aucun rappel en cours</p>
            <p className="mt-1 max-w-xs text-sm text-ink-500">Un rappel est créé automatiquement quand vous reportez une livraison ou quand un appel reste sans réponse.</p>
          </div>
        ) : (
          openReminders.map((r) => {
            const ringing = !!r.firedAt;
            return (
              <div key={r.id} className={`rounded-2xl border bg-white p-4 shadow-card ${ringing ? "border-warn-500/50 ring-2 ring-warn-500/20" : "border-ink-100"}`}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ringing ? "bg-warn-500 text-white" : "bg-ink-100 text-ink-600"}`}>
                    {r.kind === "callback" ? <PhoneCall className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/deliveries/${r.deliveryId}`} className="block truncate font-semibold text-ink-900 hover:text-brand-600">
                      {r.customerName}
                    </Link>
                    <p className="text-sm text-ink-600">{r.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{ringing ? "Sonné · " : "À "}{formatSlot(Date.parse(r.at))}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => snoozeReminder(r.id, 10)}>
                    <AlarmClock className="h-4 w-4" /> +10 min
                  </Button>
                  <Button size="sm" variant="success" onClick={() => completeReminder(r.id)}>
                    <Check className="h-4 w-4" /> Traité
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
