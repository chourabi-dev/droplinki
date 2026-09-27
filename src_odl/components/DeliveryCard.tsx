import { useNavigate } from "react-router-dom";
import { Delivery } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime, formatAmount, distanceKm } from "@/lib/utils";
import { ChevronRight, MapPin, User } from "lucide-react";

interface DeliveryCardProps {
  delivery: Delivery;
  /** Driver's live position (from navigator.geolocation), not the delivery's static driverLatitude/Longitude. */
  driverLocation?: { lat: number; lon: number } | null;
}

export function DeliveryCard({ delivery, driverLocation }: DeliveryCardProps) {
  const navigate = useNavigate();
  const distance =
    driverLocation && delivery.customerLatitude && delivery.customerLongitude
      ? distanceKm(driverLocation.lat, driverLocation.lon, delivery.customerLatitude, delivery.customerLongitude)
      : undefined;

  return (
    <button
      onClick={() => navigate(`/deliveries/${delivery.id}`)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand-200 hover:shadow-lift sm:p-5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-ink-900">{delivery.customerName}</p>
          <span className="hidden shrink-0 text-xs text-ink-500 sm:inline">· {delivery.id}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span>{formatDateTime(delivery.createdAt)}</span>
          {delivery.amount !== undefined && <span>{formatAmount(delivery.amount)}</span>}
          {distance !== undefined && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {distance.toFixed(1)} km
            </span>
          )}
        </div>
        <div className="mt-2 sm:hidden">
          <StatusBadge status={delivery.status} />
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <StatusBadge status={delivery.status} />
        <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-300 sm:hidden" />
    </button>
  );
}
