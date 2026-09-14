import { Link } from "react-router-dom";
import { Plus, Package, Clock, CheckCircle2, MapPinned, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useDeliveries } from "@/context/DeliveryContext";
import { useAuth } from "@/context/AuthContext";
import { DeliveryCard } from "@/components/DeliveryCard";
import { Button } from "@/components/ui/Button";
import { distanceKm } from "@/lib/utils";

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function Dashboard() {
  const { deliveries, isLoading, error } = useDeliveries();
  const { driver } = useAuth();

  const todayDeliveries = deliveries.filter((d) => isToday(d.createdAt));
  const pending = deliveries.filter((d) => d.status === "waiting_location");
  const completed = deliveries.filter((d) => d.status === "delivered");
  const totalDistance = deliveries.reduce((sum, d) => {
    if (d.customerLatitude && d.customerLongitude) {
      return sum + distanceKm(d.driverLatitude, d.driverLongitude, d.customerLatitude, d.customerLongitude);
    }
    return sum;
  }, 0);

  const stats = [
    { label: "Livraisons aujourd'hui", value: todayDeliveries.length, icon: Package, tint: "bg-brand-50 text-brand-600" },
    { label: "En attente de position", value: pending.length, icon: Clock, tint: "bg-warn-50 text-warn-600" },
    { label: "Livraisons terminées", value: completed.length, icon: CheckCircle2, tint: "bg-go-50 text-go-600" },
    { label: "Distance totale", value: `${totalDistance.toFixed(1)} km`, icon: MapPinned, tint: "bg-ink-100 text-ink-700" },
  ];

  const recent = [...deliveries].slice(0, 6);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">
            Bonjour{driver?.name ? `, ${driver.name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-1 text-ink-500">Voici un aperçu de votre activité.</p>
        </div>
        <Link to="/create-delivery" className="hidden sm:block">
          <Button>
            <Plus className="h-4 w-4" /> Nouvelle livraison
          </Button>
        </Link>
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

      <div className="mt-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Livraisons récentes</h2>
          <Link to="/deliveries" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
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
          <div className="space-y-3">
            {recent.map((d) => (
              <DeliveryCard key={d.id} delivery={d} />
            ))}
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
      <p className="mt-1 max-w-xs text-sm text-ink-500">Créez votre première livraison pour obtenir un lien à envoyer à votre client.</p>
      <Link to="/create-delivery" className="mt-5">
        <Button size="sm"><Plus className="h-4 w-4" /> Nouvelle livraison</Button>
      </Link>
    </div>
  );
}
