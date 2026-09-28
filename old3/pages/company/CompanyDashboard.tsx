import { Link } from "react-router-dom";
import { Plus, Package, Clock, CheckCircle2, Users, ArrowRight, Loader2, AlertCircle, UploadCloud, PhoneCall } from "lucide-react";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useCompanyDrivers } from "@/context/CompanyDriverContext";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatAmount } from "@/lib/utils";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function CompanyDashboard() {
  const { deliveries, isLoading, error } = useCompanyDeliveries();
  const { drivers } = useCompanyDrivers();
  const { company } = useCompanyAuth();

  const today = deliveries.filter((d) => isToday(d.createdAt));
  const pending = deliveries.filter((d) => d.status !== "delivered");
  const delivered = deliveries.filter((d) => d.status === "delivered");
  const unassigned = deliveries.filter((d) => !d.assignedDriverId && d.status !== "delivered");

  const stats = [
    { label: "Livraisons aujourd'hui", value: today.length, icon: Package, tint: "bg-brand-50 text-brand-600" },
    { label: "En cours", value: pending.length, icon: Clock, tint: "bg-warn-50 text-warn-600" },
    { label: "Livrées", value: delivered.length, icon: CheckCircle2, tint: "bg-go-50 text-go-600" },
    { label: "Livreurs actifs", value: drivers.filter((d) => d.status === "active").length, icon: Users, tint: "bg-ink-100 text-ink-700" },
  ];

  const recent = [...deliveries].slice(0, 6);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
            Bonjour{company?.name ? `, ${company.name}` : ""} 👋
          </h1>
          <p className="mt-1 text-ink-500">Voici un aperçu de l'activité de votre entreprise.</p>
        </div>
        <div className="hidden gap-2 sm:flex">
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:p-5">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.tint}`}>
              <s.icon className="h-4.5 w-4.5" />
            </div>
            <p className="font-display text-2xl font-bold text-ink-950">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-warn-500/20 bg-warn-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-warn-600" />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                {unassigned.length} livraison{unassigned.length > 1 ? "s" : ""} sans livreur assigné
              </p>
              <p className="text-xs text-ink-500">Assignez un livreur ou confirmez la position client par appel.</p>
            </div>
          </div>
          <Link to="/company/deliveries?filter=unassigned">
            <Button size="sm" variant="outline">
              Voir <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Livraisons récentes</h2>
          <Link to="/company/deliveries" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Tout voir <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : recent.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Créée le</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Montant</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recent.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer hover:bg-ink-50"
                    onClick={() => (window.location.href = `/company/deliveries/${d.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{d.customerName}</p>
                      <p className="text-xs text-ink-500">{d.id}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatDateTime(d.createdAt)}</td>
                    <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{formatAmount(d.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
      <p className="font-display font-semibold text-ink-900">Impossible de charger les livraisons</p>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Package className="h-6 w-6" />
      </div>
      <p className="font-display font-semibold text-ink-900">Aucune livraison pour l'instant</p>
      <p className="mt-1 max-w-xs text-sm text-ink-500">Créez votre première livraison ou importez-en plusieurs via un fichier CSV.</p>
      <div className="mt-5 flex gap-2">
        <Link to="/company/deliveries/import">
          <Button size="sm" variant="outline">
            <UploadCloud className="h-4 w-4" /> Importer un CSV
          </Button>
        </Link>
        <Link to="/company/deliveries/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle livraison
          </Button>
        </Link>
      </div>
    </div>
  );
}
