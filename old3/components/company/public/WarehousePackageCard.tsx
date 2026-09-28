import { ReactNode } from "react";
import { Phone, MapPinned, Wallet, StickyNote, Clock } from "lucide-react";
import { CompanyDelivery } from "@/types";
import { formatAmount, formatDateTime } from "@/lib/utils";
import { WarehouseStageBadge } from "@/components/company/public/WarehouseStageBadge";

export function WarehousePackageCard({ delivery, actions }: { delivery: CompanyDelivery; actions: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink-900">{delivery.customerName}</p>
          <span className="text-xs text-ink-500">
            {delivery.id} {delivery.reference ? `· ${delivery.reference}` : ""}
          </span>
          {delivery.warehouseStage && <WarehouseStageBadge stage={delivery.warehouseStage} />}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {delivery.customerPhone}
          </span>
          {delivery.address && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPinned className="h-3 w-3 shrink-0" /> <span className="truncate">{delivery.address}</span>
            </span>
          )}
          {delivery.amount !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" /> {formatAmount(delivery.amount)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatDateTime(delivery.warehouseUpdatedAt || delivery.createdAt)}
          </span>
        </div>
        {delivery.notes && (
          <p className="mt-1.5 inline-flex items-start gap-1 text-xs text-ink-500">
            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" /> {delivery.notes}
          </p>
        )}
        {delivery.returnReason && (
          <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            Motif du retour : {delivery.returnReason}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    </div>
  );
}
