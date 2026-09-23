import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Package, CheckCircle2, MapPin, Timer, RefreshCcw } from "lucide-react";
import { companyStatsApi } from "@/lib/companyApi";
import { companyDeliveryErrorMessage } from "@/context/CompanyDeliveryContext";
import { Button } from "@/components/ui/Button";
import { CompanyStats as CompanyStatsData } from "@/types";
import { formatDateTime } from "@/lib/utils";

const RANGES = [
  { days: 7, label: "7 jours" },
  { days: 14, label: "14 jours" },
  { days: 30, label: "30 jours" },
];

export default function CompanyStats() {
  const [range, setRange] = useState(14);
  const [stats, setStats] = useState<CompanyStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    companyStatsApi
      .get(range)
      .then((d) => !cancelled && setStats(d))
      .catch((err) => !cancelled && setError(companyDeliveryErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Statistiques</h1>
          <p className="mt-1 text-ink-500">Le pouls de votre activité de livraison.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                range === r.days ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les statistiques</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setRange((r) => r)}>
            <RefreshCcw className="h-3.5 w-3.5" /> Réessayer
          </Button>
        </div>
      ) : stats ? (
        <StatsView stats={stats} />
      ) : null}
    </div>
  );
}

function StatsView({ stats }: { stats: CompanyStatsData }) {
  const cards = [
    { label: "Livraisons totales", value: stats.totalDeliveries, icon: Package, tint: "bg-brand-50 text-brand-600" },
    { label: "Livrées", value: stats.delivered, icon: CheckCircle2, tint: "bg-go-50 text-go-600" },
    { label: "En attente", value: stats.pending, icon: Timer, tint: "bg-warn-50 text-warn-600" },
    { label: "Positions confirmées", value: stats.locationConfirmed, icon: MapPin, tint: "bg-ink-100 text-ink-700" },
  ];

  const maxDaily = Math.max(1, ...stats.daily.map((d) => Math.max(d.created, d.delivered)));
  const maxDriver = Math.max(1, ...stats.byDriver.map((d) => d.assigned));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.tint}`}>
              <c.icon className="h-4.5 w-4.5" />
            </div>
            <p className="font-display text-2xl font-bold text-ink-950">{c.value}</p>
            <p className="mt-0.5 text-xs text-ink-500">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.avgTimeToLocationMinutes !== undefined && (
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <p className="text-sm text-ink-500">Temps moyen pour obtenir la position d'un client</p>
          <p className="mt-1 font-display text-xl font-bold text-ink-950">{Math.round(stats.avgTimeToLocationMinutes)} min</p>
        </div>
      )}

      {/* Daily volume chart */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900">Volume quotidien</h2>
          <div className="flex items-center gap-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> Créées
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-go-500" /> Livrées
            </span>
          </div>
        </div>
        {stats.daily.length === 0 ? (
          <p className="text-sm text-ink-500">Pas encore de données sur cette période.</p>
        ) : (
          <div className="flex h-48 items-end gap-2 overflow-x-auto">
            {stats.daily.map((d) => (
              <div key={d.date} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    className="w-2.5 rounded-t bg-brand-500"
                    style={{ height: `${(d.created / maxDaily) * 100}%` }}
                    title={`${d.created} créées`}
                  />
                  <div
                    className="w-2.5 rounded-t bg-go-500"
                    style={{ height: `${(d.delivered / maxDaily) * 100}%` }}
                    title={`${d.delivered} livrées`}
                  />
                </div>
                <span className="text-[10px] text-ink-400">
                  {new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-driver breakdown */}
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-5 font-display font-semibold text-ink-900">Performance par livreur</h2>
        {stats.byDriver.length === 0 ? (
          <p className="text-sm text-ink-500">Aucune livraison assignée pour l'instant.</p>
        ) : (
          <div className="space-y-4">
            {stats.byDriver.map((d) => (
              <div key={d.driverId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-900">{d.driverName}</span>
                  <span className="text-ink-500">
                    {d.delivered}/{d.assigned} livrées
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(d.assigned / maxDriver) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
