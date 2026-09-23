import { useState } from "react";
import { Plus, Loader2, AlertCircle, Users, Phone, Mail, Car, X, MoreVertical, Trash2 } from "lucide-react";
import { useCompanyDrivers, companyErrorMessage } from "@/context/CompanyDriverContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { formatDateTime } from "@/lib/utils";
import { CompanyDriver } from "@/types";

const STATUS_LABELS: Record<CompanyDriver["status"], string> = {
  active: "Actif",
  invited: "Invité",
  inactive: "Inactif",
};
const STATUS_TINTS: Record<CompanyDriver["status"], string> = {
  active: "bg-go-50 text-go-600",
  invited: "bg-warn-50 text-warn-600",
  inactive: "bg-ink-100 text-ink-500",
};

export default function CompanyDrivers() {
  const { drivers, isLoading, error, addDriver, updateDriver, removeDriver } = useCompanyDrivers();
  const { deliveries } = useCompanyDeliveries();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const activeCount = (driverId: string) => deliveries.filter((d) => d.assignedDriverId === driverId && d.status !== "delivered").length;

  async function handleStatusChange(id: string, status: CompanyDriver["status"]) {
    try {
      await updateDriver(id, { status });
      showToast("Statut mis à jour", "success");
    } catch (err) {
      showToast(companyErrorMessage(err), "warning");
    } finally {
      setOpenMenuId(null);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeDriver(id);
      showToast("Livreur supprimé", "success");
    } catch (err) {
      showToast(companyErrorMessage(err), "warning");
    } finally {
      setOpenMenuId(null);
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Livreurs</h1>
          <p className="mt-1 text-ink-500">Gérez les membres de votre équipe de livraison.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Ajouter un livreur
        </Button>
      </div>

      {showForm && <AddDriverForm onClose={() => setShowForm(false)} onCreate={addDriver} />}

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les livreurs</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : drivers.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Users className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucun livreur pour l'instant</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">Ajoutez vos livreurs pour pouvoir leur assigner des livraisons.</p>
          <Button size="sm" className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Ajouter un livreur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <Card key={d.id} className="relative">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="relative">
                    <button
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50"
                      onClick={() => setOpenMenuId(openMenuId === d.id ? null : d.id)}
                      aria-label="Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === d.id && (
                      <div className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-ink-100 bg-white p-1.5 shadow-lift">
                        {(["active", "inactive"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(d.id, s)}
                            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                          >
                            Marquer {STATUS_LABELS[s].toLowerCase()}
                          </button>
                        ))}
                        <button
                          onClick={() => handleRemove(d.id)}
                          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-3 font-display font-semibold text-ink-900">{d.name}</p>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TINTS[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>

                <div className="mt-3 space-y-1.5 text-sm text-ink-500">
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {d.phone}
                  </p>
                  {d.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {d.email}
                    </p>
                  )}
                  {d.vehicleType && (
                    <p className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5" /> {d.vehicleType}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
                  <span>{activeCount(d.id)} livraison(s) en cours</span>
                  <span>Depuis {formatDateTime(d.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddDriverForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; phone: string; email?: string; vehicleType?: string }) => Promise<CompanyDriver>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", vehicleType: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onCreate({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        vehicleType: form.vehicleType || undefined,
      });
      showToast("Livreur ajouté", "success");
      onClose();
    } catch (err) {
      setError(companyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900">Ajouter un livreur</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nom complet" placeholder="Ex. Karim Trabelsi" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          <Input label="Téléphone" type="tel" placeholder="+216 20 123 456" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
          <Input label="Email (optionnel)" type="email" placeholder="livreur@exemple.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
          <Input label="Véhicule (optionnel)" placeholder="Ex. Moto, Camionnette" value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Ajout..." : "Ajouter le livreur"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
