import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, UploadCloud, Search, Loader2, AlertCircle, Package, ChevronRight, User2 } from "lucide-react";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useCompanyDrivers } from "@/context/CompanyDriverContext";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatAmount, cn } from "@/lib/utils";
import { DeliveryStatus, STATUS_LABELS, companyDriverFullName } from "@/types";

type FilterKey = "all" | "unassigned" | DeliveryStatus;

export default function CompanyDeliveries() {
  const { deliveries, isLoading, error } = useCompanyDeliveries();
  const { drivers } = useCompanyDrivers();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>((searchParams.get("filter") as FilterKey) || "all");
  const [query, setQuery] = useState("");

  const driverName = (id?: string) => {
    const driver = id ? drivers.find((d) => d.id === id) : undefined;
    return driver ? companyDriverFullName(driver) : undefined;
  };

  const filtered = useMemo(() => {
    let list = deliveries;
    if (filter === "unassigned") list = list.filter((d) => !d.assignedDriverId && d.status !== "delivered");
    else if (filter !== "all") list = list.filter((d) => d.status === filter);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.customerName.toLowerCase().includes(q) ||
          d.customerPhone.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          (d.reference || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [deliveries, filter, query]);

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "unassigned", label: "Non assignées" },
    { key: "waiting_location", label: STATUS_LABELS.waiting_location },
    { key: "location_received", label: STATUS_LABELS.location_received },
    { key: "delivered", label: STATUS_LABELS.delivered },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Livraisons</h1>
          <p className="mt-1 text-ink-500">{deliveries.length} livraison(s) au total.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/company/deliveries/import">
            <Button variant="outline">
              <UploadCloud className="h-4 w-4" /> Importer un CSV
            </Button>
          </Link>
          <Link to="/company/deliveries/new">
            <Button>
              <Plus className="h-4 w-4" /> Nouvelle livraison
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === chip.key ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, un ID..."
            className="w-full rounded-xl border border-ink-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 sm:w-72"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Package className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucune livraison ne correspond</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">Essayez un autre filtre ou créez une nouvelle livraison.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Livreur</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Créée le</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Montant</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/company/deliveries/${d.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{d.customerName}</p>
                    <p className="text-xs text-ink-500">
                      {d.id} {d.reference ? `· ${d.reference}` : ""}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {driverName(d.assignedDriverId) ? (
                      <span className="inline-flex items-center gap-1.5 text-ink-700">
                        <User2 className="h-3.5 w-3.5 text-ink-400" /> {driverName(d.assignedDriverId)}
                      </span>
                    ) : (
                      <span className="text-ink-400">Non assigné</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDateTime(d.createdAt)}</td>
                  <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatAmount(d.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-ink-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
