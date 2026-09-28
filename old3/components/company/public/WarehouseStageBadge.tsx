import { WarehouseStage, WAREHOUSE_STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const DOT_COLORS: Record<WarehouseStage, string> = {
  en_depot: "bg-warn-500",
  en_chargement: "bg-blue-500",
  charge: "bg-go-500",
  retour: "bg-red-500",
};

const BG_COLORS: Record<WarehouseStage, string> = {
  en_depot: "bg-warn-50 text-warn-600",
  en_chargement: "bg-blue-50 text-blue-700",
  charge: "bg-go-50 text-go-600",
  retour: "bg-red-50 text-red-600",
};

export function WarehouseStageBadge({ stage, className }: { stage: WarehouseStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        BG_COLORS[stage],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_COLORS[stage], stage === "en_chargement" && "animate-pulse")} />
      {WAREHOUSE_STAGE_LABELS[stage]}
    </span>
  );
}
