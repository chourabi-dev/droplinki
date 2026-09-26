import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Package, Loader2, AlertCircle } from "lucide-react";
import { useClientDeliveries } from "@/context/ClientDeliveryContext";
import { ClientDeliveryCard } from "@/components/client/ClientDeliveryCard";
import { Button } from "@/components/ui/Button";
import { DeliveryStatus } from "@/types";
import { cn } from "@/lib/utils";

const FILTERS: { key: DeliveryStatus | "all"; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "waiting_location", label: "En attente" },
  { key: "opened", label: "Lien ouvert" },
  { key: "location_received", label: "Position reçue" },
  { key: "delivered", label: "Livrées" },
];

export default function ClientDeliveries() {
  const { deliveries, isLoading, error } = useClientDeliveries();
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");

  const filtered = filter === "all" ? deliveries : deliveries.filter((d) => d.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Livraisons</h1>
          <p className="mt-1 text-ink-500">{deliveries.length} livraison(s) au total.</p>
        </div>
        <Link to="/client/create-delivery" className="hidden sm:block">
          <Button>
            <Plus className="h-4 w-4" /> Nouvelle livraison
          </Button>
        </Link>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 dl-scroll">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full mt-2 px-4 py-2 text-sm font-semibold transition-colors",
              filter === f.key ? "bg-ink-900 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
            <Package className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucune livraison dans cette catégorie</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">Essayez un autre filtre ou créez une nouvelle livraison.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => (
            <ClientDeliveryCard key={d.id} delivery={d} />
          ))}
        </div>
      )}
    </div>
  );
}
