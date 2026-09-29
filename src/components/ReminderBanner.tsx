import { useNavigate } from "react-router-dom";
import { BellRing, Check, AlarmClock, Eye } from "lucide-react";
import { usePlanner } from "@/context/DriverPlannerContext";

/** Sticky strip listing reminders that have rung and haven't been handled yet. */
export function ReminderBanner() {
  const { ringingReminders, completeReminder, snoozeReminder } = usePlanner();
  const navigate = useNavigate();
  if (ringingReminders.length === 0) return null;

  return (
    <div className="sticky top-16 z-30 border-b border-warn-500/30 bg-warn-50">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-2.5 sm:px-6">
        {ringingReminders.slice(0, 3).map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <BellRing className="h-5 w-5 shrink-0 animate-pulse text-warn-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{r.customerName}</p>
              <p className="truncate text-xs text-ink-600">{r.label}</p>
            </div>
            <button
              onClick={() => {
                completeReminder(r.id);
                navigate(`/deliveries/${r.deliveryId}`);
              }}
              className="flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <Eye className="h-3.5 w-3.5" /> Voir
            </button>
            <button
              onClick={() => snoozeReminder(r.id, 10)}
              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-ink-200"
              aria-label="Reporter le rappel de 10 minutes"
            >
              <AlarmClock className="h-3.5 w-3.5" /> +10 min
            </button>
            <button
              onClick={() => completeReminder(r.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-go-600 ring-1 ring-ink-200"
              aria-label="Marquer comme traité"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ))}
        {ringingReminders.length > 3 && (
          <button onClick={() => navigate("/reminders")} className="text-xs font-semibold text-warn-600">
            + {ringingReminders.length - 3} autre(s) rappel(s)
          </button>
        )}
      </div>
    </div>
  );
}
