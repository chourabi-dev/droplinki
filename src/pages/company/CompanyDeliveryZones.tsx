import { useState } from "react";
import { Plus, Loader2, AlertCircle, MapPinned, MapPin, X, ChevronRight, Check, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useCompanyDeliveryZones, companyZoneErrorMessage } from "@/context/CompanyDeliveryZoneContext";
import { useCompanyGeo, companyGeoErrorMessage } from "@/context/CompanyGeoContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { DeliveryZone, Governorate, Delegation } from "@/types";
import { CreateDeliveryZoneInput } from "@/lib/companyApi";

export default function CompanyDeliveryZones() {
  const { zones, isLoading, error, addZone, updateZone, removeZone } = useCompanyDeliveryZones();
  const { governorates, getDelegations } = useCompanyGeo();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function governorateName(zone: DeliveryZone): string | undefined {
    if (zone.governorateId) return governorates.find((g) => g.id === zone.governorateId)?.name;
    // Fall back to looking the delegation up in whichever governorate's delegations we've already cached.
    for (const g of governorates) {
      const delegations = getDelegations(g.id);
      if (delegations?.some((d) => d.id === zone.delegationId)) return g.name;
    }
    return undefined;
  }

  function delegationName(zone: DeliveryZone): string {
    if (zone.delegation) return zone.delegation.name;
    for (const g of governorates) {
      const match = getDelegations(g.id)?.find((d) => d.id === zone.delegationId);
      if (match) return match.name;
    }
    return zone.delegationId;
  }

  async function handleRemove(id: string) {
    try {
      await removeZone(id);
      showToast("Zone de livraison supprimée", "success");
    } catch (err) {
      showToast(companyZoneErrorMessage(err), "warning");
    } finally {
      setOpenMenuId(null);
    }
  }

  async function handleToggleActive(zone: DeliveryZone) {
    try {
      await updateZone(zone.id, { isActive: !zone.isActive });
      showToast(zone.isActive ? "Zone désactivée" : "Zone activée", "success");
    } catch (err) {
      showToast(companyZoneErrorMessage(err), "warning");
    } finally {
      setOpenMenuId(null);
    }
  }

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Zones de livraison</h1>
          <p className="mt-1 text-ink-500">Gérez les zones couvertes par votre entreprise, par gouvernorat et délégation.</p>
        </div>
        <Button
          onClick={() => {
            setEditingZone(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nouvelle zone
        </Button>
      </div>

      {showForm && (
        <ZoneWizard
          initialZone={editingZone}
          onClose={() => {
            setShowForm(false);
            setEditingZone(null);
          }}
          onCreate={addZone}
          onUpdate={updateZone}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les zones de livraison</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : zones.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <MapPinned className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucune zone de livraison pour l'instant</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">
            Créez vos zones (par gouvernorat et délégation) pour pouvoir y rattacher vos livreurs.
          </p>
          <Button size="sm" className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Nouvelle zone
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <Card key={z.id} className="relative">
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="relative">
                    <button
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50"
                      onClick={() => setOpenMenuId(openMenuId === z.id ? null : z.id)}
                      aria-label="Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === z.id && (
                      <div className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-ink-100 bg-white p-1.5 shadow-lift">
                        <button
                          onClick={() => {
                            setEditingZone(z);
                            setShowForm(true);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => handleToggleActive(z)}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                        >
                          Marquer {z.isActive ? "inactive" : "active"}
                        </button>
                        <button
                          onClick={() => handleRemove(z.id)}
                          className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-3 font-display font-semibold text-ink-900">{z.name}</p>
                {z.nameAr && <p dir="rtl" className="text-sm text-ink-500">{z.nameAr}</p>}
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    z.isActive ? "bg-go-50 text-go-600" : "bg-ink-100 text-ink-500"
                  }`}
                >
                  {z.isActive ? "Active" : "Inactive"}
                </span>

                {z.description && <p className="mt-2 text-sm text-ink-500">{z.description}</p>}

                <div className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
                  <p>
                    {delegationName(z)}
                    {governorateName(z) ? `, ${governorateName(z)}` : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type WizardStep = "governorate" | "delegation" | "details";

function ZoneWizard({
  initialZone,
  onClose,
  onCreate,
  onUpdate,
}: {
  initialZone: DeliveryZone | null;
  onClose: () => void;
  onCreate: (input: CreateDeliveryZoneInput) => Promise<DeliveryZone>;
  onUpdate: (id: string, input: Partial<CreateDeliveryZoneInput>) => Promise<void>;
}) {
  const { showToast } = useToast();
  const { governorates, governoratesLoading, governoratesError, ensureDelegations, getDelegations, isLoadingDelegations, getDelegationsError } =
    useCompanyGeo();

  const isEditing = !!initialZone;

  const [step, setStep] = useState<WizardStep>(isEditing ? "details" : "governorate");
  const [governorate, setGovernorate] = useState<Governorate | null>(null);
  const [delegation, setDelegation] = useState<Delegation | null>(null);

  const [form, setForm] = useState({
    name: initialZone?.name ?? "",
    nameAr: initialZone?.nameAr ?? "",
    description: initialZone?.description ?? "",
    isActive: initialZone?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function pickGovernorate(g: Governorate) {
    setGovernorate(g);
    setDelegation(null);
    setStep("delegation");
    try {
      await ensureDelegations(g.id);
    } catch {
      // surfaced inline via getDelegationsError
    }
  }

  function pickDelegation(d: Delegation) {
    setDelegation(d);
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const delegationId = isEditing ? initialZone!.delegationId : delegation?.id;
    if (!delegationId) {
      setError("Sélectionnez un gouvernorat puis une délégation.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await onUpdate(initialZone!.id, {
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });
        showToast("Zone de livraison mise à jour", "success");
      } else {
        await onCreate({
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          delegationId,
        });
        showToast("Zone de livraison créée", "success");
      }
      onClose();
    } catch (err) {
      setError(companyZoneErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const delegationsForGovernorate = governorate ? getDelegations(governorate.id) : undefined;
  const delegationsLoading = governorate ? isLoadingDelegations(governorate.id) : false;
  const delegationsError = governorate ? getDelegationsError(governorate.id) : null;

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-ink-900">{isEditing ? "Modifier la zone" : "Nouvelle zone de livraison"}</h2>
            {!isEditing && (
              <div className="mt-1 flex items-center gap-1 text-xs text-ink-400">
                <span className={step === "governorate" ? "font-semibold text-brand-600" : ""}>1. Gouvernorat</span>
                <ChevronRight className="h-3 w-3" />
                <span className={step === "delegation" ? "font-semibold text-brand-600" : ""}>2. Délégation</span>
                <ChevronRight className="h-3 w-3" />
                <span className={step === "details" ? "font-semibold text-brand-600" : ""}>3. Détails de la zone</span>
              </div>
            )}
          </div>
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

        {/* Step 1 — pick a governorate (fetched from the API) */}
        {!isEditing && step === "governorate" && (
          <div>
            {governoratesLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des gouvernorats...
              </div>
            ) : governoratesError ? (
              <p className="py-6 text-sm text-red-600">{governoratesError}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {governorates.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => pickGovernorate(g)}
                    className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-ink-800 hover:border-brand-400 hover:bg-brand-50"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — pick a delegation within the chosen governorate */}
        {!isEditing && step === "delegation" && governorate && (
          <div>
            <button
              type="button"
              onClick={() => setStep("governorate")}
              className="mb-3 text-xs font-medium text-ink-500 hover:text-ink-800"
            >
              ← Changer de gouvernorat ({governorate.name})
            </button>
            {delegationsLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement des délégations...
              </div>
            ) : delegationsError ? (
              <p className="py-6 text-sm text-red-600">{delegationsError}</p>
            ) : !delegationsForGovernorate || delegationsForGovernorate.length === 0 ? (
              <p className="py-6 text-sm text-ink-400">Aucune délégation trouvée pour ce gouvernorat.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {delegationsForGovernorate.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pickDelegation(d)}
                    className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-ink-800 hover:border-brand-400 hover:bg-brand-50"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — zone details, once a delegation is locked in */}
        {(isEditing || step === "details") && (delegation || isEditing) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditing && governorate && delegation && (
              <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> {delegation.name}, {governorate.name}
                </span>
                <button type="button" onClick={() => setStep("delegation")} className="text-xs font-semibold underline hover:no-underline">
                  Changer
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nom de la zone" placeholder="Ex. Centre-ville" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              <Input
                label="Nom en arabe"
                dir="rtl"
                placeholder="مثال: وسط المدينة"
                value={form.nameAr}
                onChange={(e) => update("nameAr", e.target.value)}
                required
              />
            </div>
            <Textarea
              label="Description (optionnel)"
              placeholder="Rues, repères ou limites de la zone..."
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              Zone active (livrable immédiatement)
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !form.name.trim() || !form.nameAr.trim()}>
                {loading ? "Enregistrement..." : isEditing ? "Enregistrer" : "Créer la zone"}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuler
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
