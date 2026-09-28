import { useState } from "react";
import { Plus, Loader2, AlertCircle, MapPinned, MapPin, X, Check, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useCompanyDeliveryZones, companyZoneErrorMessage } from "@/context/CompanyDeliveryZoneContext";
import { useCompanyGeo } from "@/context/CompanyGeoContext";
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

  /** Best-effort delegation lookup: prefer the API's embedded `delegations`,
   * otherwise fall back to whichever governorate's delegations we've already
   * cached (from browsing the picker elsewhere in the session). */
  function resolveDelegations(zone: DeliveryZone): { delegation: Delegation; governorateName?: string }[] {
    if (zone.delegations && zone.delegations.length > 0) {
      return zone.delegations.map((d) => ({
        delegation: d,
        governorateName: governorates.find((g) => g.id === d.governorateId)?.name,
      }));
    }
    const resolved: { delegation: Delegation; governorateName?: string }[] = [];
    for (const id of zone.delegationIds) {
      let found: { delegation: Delegation; governorateName?: string } | undefined;
      for (const g of governorates) {
        const match = getDelegations(g.id)?.find((d) => d.id === id);
        if (match) {
          found = { delegation: match, governorateName: g.name };
          break;
        }
      }
      resolved.push(found ?? { delegation: { id, name: id, governorateId: "" } });
    }
    return resolved;
  }

  /** Groups a zone's delegations by governorate for compact display, e.g.
   * "Tunis : Carthage, La Marsa · Ben Arous : Hammam Lif, Boumhel". */
  function groupedCoverageLabel(zone: DeliveryZone): string {
    const resolved = resolveDelegations(zone);
    const byGovernorate = new Map<string, string[]>();
    for (const { delegation, governorateName } of resolved) {
      const key = governorateName ?? "Autre";
      if (!byGovernorate.has(key)) byGovernorate.set(key, []);
      byGovernorate.get(key)!.push(delegation.name);
    }
    return Array.from(byGovernorate.entries())
      .map(([gov, delegs]) => `${gov} : ${delegs.join(", ")}`)
      .join(" · ");
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
          <p className="mt-1 text-ink-500">
            Regroupez une ou plusieurs délégations (d'un ou plusieurs gouvernorats) dans chaque zone couverte par votre entreprise.
          </p>
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
            Créez vos zones en regroupant une ou plusieurs délégations pour pouvoir y rattacher vos livreurs.
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
                  <p className="font-medium text-ink-600">
                    {z.delegationIds.length} délégation{z.delegationIds.length > 1 ? "s" : ""} couverte
                    {z.delegationIds.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5">{groupedCoverageLabel(z)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** A delegation pick accumulated while composing/editing a zone, tagged with
 * enough context (name + governorate name) to render chips without a
 * further round-trip. */
interface PickedDelegation {
  id: string;
  name: string;
  governorateId: string;
  governorateName: string;
}

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

  // The governorate currently being browsed in the delegation picker. Picks
  // accumulate across governorate switches, so a single zone can mix e.g.
  // Tunis + Ben Arous delegations.
  const [browsingGovernorate, setBrowsingGovernorate] = useState<Governorate | null>(null);

  const [picked, setPicked] = useState<PickedDelegation[]>(() => {
    if (!initialZone) return [];
    if (initialZone.delegations && initialZone.delegations.length > 0) {
      return initialZone.delegations.map((d) => ({
        id: d.id,
        name: d.name,
        governorateId: d.governorateId,
        governorateName: governorates.find((g) => g.id === d.governorateId)?.name ?? "",
      }));
    }
    // No embedded delegation details — seed bare entries from the ids so the
    // count/selection is still correct; names resolve once picked/re-picked.
    return initialZone.delegationIds.map((id) => ({ id, name: id, governorateId: "", governorateName: "" }));
  });

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

  async function browseGovernorate(g: Governorate) {
    setBrowsingGovernorate(g);
    try {
      await ensureDelegations(g.id);
    } catch {
      // surfaced inline via getDelegationsError
    }
  }

  function isPicked(delegationId: string) {
    return picked.some((p) => p.id === delegationId);
  }

  function togglePick(d: Delegation, governorateName: string) {
    setPicked((prev) =>
      prev.some((p) => p.id === d.id)
        ? prev.filter((p) => p.id !== d.id)
        : [...prev, { id: d.id, name: d.name, governorateId: d.governorateId, governorateName }]
    );
  }

  function removePick(id: string) {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  }

  // Group accumulated picks by governorate for the chips list, e.g.
  // "Tunis" -> ["Carthage", "La Marsa"], "Ben Arous" -> ["Hammam Lif", ...]
  const pickedByGovernorate = picked.reduce<Record<string, PickedDelegation[]>>((acc, p) => {
    const key = p.governorateName || "Autre";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (picked.length === 0) {
      setError("Sélectionnez au moins une délégation à couvrir par cette zone.");
      return;
    }

    const delegationIds = picked.map((p) => p.id);

    setLoading(true);
    try {
      if (isEditing) {
        await onUpdate(initialZone!.id, {
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          delegationIds,
        });
        showToast("Zone de livraison mise à jour", "success");
      } else {
        await onCreate({
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          description: form.description.trim() || undefined,
          isActive: form.isActive,
          delegationIds,
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

  const delegationsForBrowsing = browsingGovernorate ? getDelegations(browsingGovernorate.id) : undefined;
  const delegationsLoading = browsingGovernorate ? isLoadingDelegations(browsingGovernorate.id) : false;
  const delegationsError = browsingGovernorate ? getDelegationsError(browsingGovernorate.id) : null;

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-ink-900">{isEditing ? "Modifier la zone" : "Nouvelle zone de livraison"}</h2>
            <p className="mt-1 text-xs text-ink-400">
              Une zone peut couvrir une ou plusieurs délégations, y compris de gouvernorats différents.
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Delegation coverage — 1 to N, accumulated across governorates */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              Délégations couvertes <span className="text-red-500">*</span>
            </label>

            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-medium text-ink-600">Parcourir un gouvernorat</label>
                {governoratesLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-ink-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement des gouvernorats...
                  </div>
                ) : governoratesError ? (
                  <p className="py-2 text-sm text-red-600">{governoratesError}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {governorates.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => browseGovernorate(g)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          browsingGovernorate?.id === g.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-ink-200 bg-white text-ink-700 hover:border-brand-300"
                        }`}
                      >
                        {g.name}
                        {picked.some((p) => p.governorateId === g.id) && (
                          <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {picked.filter((p) => p.governorateId === g.id).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3">
                {!browsingGovernorate ? (
                  <p className="text-sm text-ink-400">Choisissez un gouvernorat pour cocher ses délégations.</p>
                ) : delegationsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-ink-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Chargement des délégations...
                  </div>
                ) : delegationsError ? (
                  <p className="py-4 text-sm text-red-600">{delegationsError}</p>
                ) : !delegationsForBrowsing || delegationsForBrowsing.length === 0 ? (
                  <p className="py-4 text-sm text-ink-400">Aucune délégation trouvée pour ce gouvernorat.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {delegationsForBrowsing.map((d) => (
                      <label
                        key={d.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm hover:border-brand-300"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          checked={isPicked(d.id)}
                          onChange={() => togglePick(d, browsingGovernorate.name)}
                        />
                        <span className="text-ink-800">{d.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {picked.length > 0 && (
              <div className="mt-3 space-y-2">
                {Object.entries(pickedByGovernorate).map(([governorateName, delegs]) => (
                  <div key={governorateName} className="flex flex-wrap items-start gap-1.5 text-sm">
                    <span className="mt-1 shrink-0 font-medium text-ink-600">{governorateName || "—"} :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {delegs.map((d) => (
                        <span
                          key={d.id}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                        >
                          <Check className="h-3 w-3" /> {d.name}
                          <button
                            type="button"
                            onClick={() => removePick(d.id)}
                            className="text-brand-500 hover:text-brand-800"
                            aria-label={`Retirer ${d.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nom de la zone" placeholder="Ex. Zone A" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            <Input
              label="Nom en arabe"
              dir="rtl"
              placeholder="مثال: المنطقة أ"
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
            <Button type="submit" disabled={loading || !form.name.trim() || !form.nameAr.trim() || picked.length === 0}>
              {loading ? "Enregistrement..." : isEditing ? "Enregistrer" : "Créer la zone"}
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
