import { MapPin, MapPinOff, Crosshair } from "lucide-react";
import { Precision } from "@/lib/routing";
import { cn } from "@/lib/utils";

const CONFIG: Record<Precision, { label: string; cls: string; icon: typeof MapPin }> = {
  exact: { label: "Position exacte", cls: "bg-go-50 text-go-600", icon: Crosshair },
  address: { label: "Estimée (adresse)", cls: "bg-brand-50 text-brand-700", icon: MapPin },
  zone: { label: "Zone approx.", cls: "bg-warn-50 text-warn-600", icon: MapPin },
  none: { label: "Position inconnue", cls: "bg-red-50 text-red-600", icon: MapPinOff },
};

export function PrecisionBadge({ precision, className }: { precision: Precision; className?: string }) {
  const c = CONFIG[precision];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", c.cls, className)}>
      <c.icon className="h-3 w-3" /> {c.label}
    </span>
  );
}
