import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronRight, Clock, MapPin, Navigation, Phone, User, Wallet, PhoneOff } from "lucide-react";
import { Delivery } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { PrecisionBadge } from "./PrecisionBadge";
import { usePlanner } from "@/context/DriverPlannerContext";
import { formatAmount, cn } from "@/lib/utils";
import { formatDuration, formatKm, navigateUrl, scheduledMs, Stop } from "@/lib/routing";

interface DeliveryCardProps {
  delivery: Delivery;
  /** Present when the delivery is part of today's route: shows order, leg distance, ETA. */
  stop?: Stop;
  onCall?: (d: Delivery) => void;
  onReschedule?: (d: Delivery) => void;
}

export function formatSlot(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `aujourd'hui ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `demain ${time}`;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + ` ${time}`;
}

export function DeliveryCard({ delivery, stop, onCall, onReschedule }: DeliveryCardProps) {
  const navigate = useNavigate();
  const { callsFor } = usePlanner();
  const slot = scheduledMs(delivery);
  const calls = callsFor(delivery);
  const last = calls[calls.length - 1];
  const nav = navigateUrl(delivery);
  const place = [delivery.address, delivery.delegation].filter((x) => x && x.trim()).join(" · ");
  const done = delivery.status === "delivered";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/deliveries/${delivery.id}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/deliveries/${delivery.id}`)}
      className={cn(
        "group flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border bg-white p-4 text-left shadow-card transition-all hover:border-brand-200 hover:shadow-lift sm:p-5",
        stop?.due ? "border-warn-500/50 ring-2 ring-warn-500/20" : "border-ink-100"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold",
          stop ? (stop.due ? "bg-warn-500 text-white" : "bg-brand-600 text-white") : "bg-brand-50 text-brand-600"
        )}
      >
        {stop ? stop.order : slot ? <CalendarClock className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{delivery.customerName}</p>
          <span className="hidden shrink-0 text-xs text-ink-500 sm:inline">· {delivery.id}</span>
        </div>
        {place && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{place}</span>
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {stop && stop.legKm !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700">
              <Navigation className="h-3 w-3" /> {formatKm(stop.legKm)}
            </span>
          )}
          {stop && stop.legKm !== null && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-500">
              <Clock className="h-3 w-3" /> arrivée ~{formatDuration(stop.etaMin)}
            </span>
          )}
          {stop && <PrecisionBadge precision={stop.precision} />}
          {slot && !done && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                stop?.due ? "bg-warn-500 text-white" : "bg-warn-50 text-warn-600"
              )}
            >
              <CalendarClock className="h-3 w-3" /> {stop?.due ? "Créneau atteint · " : "Reportée · "}
              {formatSlot(slot)}
            </span>
          )}
          {delivery.amount !== undefined && delivery.amount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-700">
              <Wallet className="h-3 w-3 text-ink-400" /> {formatAmount(delivery.amount)}
            </span>
          )}
          {last && (last.outcome === "no_answer" || last.outcome === "wrong_number") && !done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
              <PhoneOff className="h-3 w-3" /> {calls.filter((c) => c.outcome === "no_answer" || c.outcome === "wrong_number").length} appel(s) sans succès
            </span>
          )}
        </div>

        {!stop && (
          <div className="mt-2">
            <StatusBadge status={delivery.status} />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {!done && (
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {onCall && (
              <button
                onClick={() => onCall(delivery)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-go-50 text-go-600 hover:bg-go-500 hover:text-white"
                aria-label={`Appeler ${delivery.customerName}`}
              >
                <Phone className="h-4.5 w-4.5" />
              </button>
            )}
            {onReschedule && (
              <button
                onClick={() => onReschedule(delivery)}
                className="hidden h-10 w-10 items-center justify-center rounded-xl bg-warn-50 text-warn-600 hover:bg-warn-500 hover:text-white sm:flex"
                aria-label="Reporter"
              >
                <CalendarClock className="h-4.5 w-4.5" />
              </button>
            )}
            {nav && (
              <a
                href={nav}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white"
                aria-label="Naviguer"
              >
                <Navigation className="h-4.5 w-4.5" />
              </a>
            )}
          </div>
        )}
        <ChevronRight className="hidden h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 sm:block" />
      </div>
    </div>
  );
}
