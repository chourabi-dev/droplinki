import { useMemo, useState } from "react";
import { Package, Loader2, AlertCircle, Search } from "lucide-react";
import { useDeliveries } from "@/context/DeliveryContext";
import { usePlanner } from "@/context/DriverPlannerContext";
import { DeliveryCard } from "@/components/DeliveryCard";
import { useDeliveryActions } from "@/hooks/useDeliveryActions";
import { Delivery } from "@/types";
import { Stop } from "@/lib/routing";
import { cn } from "@/lib/utils";

type Tab = "todo" | "later" | "load" | "done" | "all";

export default function Deliveries() {
  const { isLoading, error } = useDeliveries();
  const { plan, deliveries } = usePlanner();
  const { callDelivery, rescheduleDelivery, sheets } = useDeliveryActions();
  const [tab, setTab] = useState<Tab>("todo");
  const [q, setQ] = useState("");

  const stopById = useMemo(() => new Map<string, Stop>(plan.stops.map((s) => [s.delivery.id, s])), [plan.stops]);

  const tabs: { key: Tab; label: string; list: Delivery[] }[] = [
    { key: "todo", label: "À faire", list: plan.stops.map((s) => s.delivery) },
    { key: "later", label: "Reportées", list: [...plan.later, ...plan.parked] },
    //{ key: "load", label: "À charger", list: plan.notReady },
    { key: "done", label: "Livrées", list: plan.done },
    { key: "all", label: "Toutes", list: deliveries },
  ];
  const current = tabs.find((t) => t.key === tab)!;

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? current.list.filter((d) =>
        [d.customerName, d.id, d.reference, d.address, d.delegation, d.customerPhone, d.customerEmmergencyPhone, d.recipientPhone1, d.recipientPhone2]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      )
    : current.list;

  return (
    <div>
      {sheets}
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Livraisons</h1>
        <p className="mt-1 text-ink-500">{deliveries.length} livraison(s) assignée(s) par votre société.</p>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un nom, un numéro, une adresse…"
          className="w-full rounded-xl border border-ink-300 bg-white py-3 pl-10 pr-4 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 dl-scroll">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
            )}
          >
            {t.label} <span className="opacity-60">{t.list.length}</span>
          </button>
        ))}
      </div>

      {isLoading && deliveries.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error && deliveries.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <Package className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucune livraison ici</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{needle ? "Aucun résultat pour cette recherche." : "Rien dans cette catégorie pour le moment."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((d) => (
            <DeliveryCard key={d.id} delivery={d} stop={stopById.get(d.id)} onCall={callDelivery} onReschedule={rescheduleDelivery} />
          ))}
        </div>
      )}
    </div>
  );
}
