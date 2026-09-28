import { DeliveryStatus, STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-500",
  location_received: "bg-go-500",
  opened: "bg-ink-500",
  delivered: "bg-ink-500",

};

const BG_COLORS: Record<DeliveryStatus, string> = {
  waiting_location: "bg-warn-50 text-warn-600",
  location_received: "bg-go-50 text-go-600",
  delivered: "bg-ink-100 text-ink-700",
  opened: "bg-ink-100 text-ink-700",
};

export function StatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        BG_COLORS[status],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[status], status === "location_received" && "animate-pulse")} />
      {STATUS_LABELS[status]}
    </span>
  );
}
