import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Package,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  Car,
  Calendar,
  AlertCircle,
  MapPinned,
  X,
  ChevronDown,
  HandCoins,
} from "lucide-react";
import { useCompanyDrivers, companyErrorMessage } from "@/context/CompanyDriverContext";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { useCompanyDeliveryZones } from "@/context/CompanyDeliveryZoneContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
 
import { VehicleType, VEHICLE_TYPE_LABELS, companyDriverFullName } from "@/types";

const VEHICLE_TYPES = Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[];

interface EditableFields {
  firstName: string;
  lastName: string;
  phone: string;
  cin: string;
  email: string;
  address: string;
  vehicleType: VehicleType | "";
  vehicleBrand: string;
  vehicleModel: string;
  plateNumber: string;
  drivingLicenseNumber: string;
}

export default function CompanyDriverDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDriver, updateDriver, removeDriver, isLoading } = useCompanyDrivers();
  const { deliveries } = useCompanyDeliveries();
  const { zones: allZones } = useCompanyDeliveryZones();
  const { showToast } = useToast();

  const driver = id ? getDriver(id) : undefined;

  const [form, setForm] = useState<EditableFields | null>(null);
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [zonePickerOpen, setZonePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driver) return;
    setForm({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      cin: driver.cin,
      email: driver.email || "",
      address: driver.address || "",
      vehicleType: driver.vehicleType,
      vehicleBrand: driver.vehicleBrand || "",
      vehicleModel: driver.vehicleModel || "",
      plateNumber: driver.plateNumber || "",
      drivingLicenseNumber: driver.drivingLicenseNumber || "",
    });
    setZoneIds(driver.deliveryZoneIds || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);

  if (isLoading && !driver) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!driver || !form) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">Livreur introuvable</p>
        <p className="mt-1 text-ink-500">Ce livreur n'existe pas ou plus.</p>
        <Link to="/company/drivers" className="mt-5 inline-block">
          <Button variant="outline">Retour aux livreurs</Button>
        </Link>
      </div>
    );
  }

  function update<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function zoneName(zoneId: string): string {
    return allZones.find((z) => z.id === zoneId)?.name ?? zoneId;
  }

  function addZoneId(zoneId: string) {
    if (!zoneId || zoneIds.includes(zoneId)) return;
    setZoneIds((prev) => [...prev, zoneId]);
    setZonePickerOpen(false);
  }

  function removeZoneId(zoneId: string) {
    setZoneIds((prev) => prev.filter((zid) => zid !== zoneId));
  }

  const availableZones = allZones.filter((z) => !zoneIds.includes(z.id));

  const activeDeliveries = deliveries.filter((d) => d.assignedDriverId === driver.id && d.status !== "delivered").length;
  const completedDeliveries = deliveries.filter((d) => d.assignedDriverId === driver.id && d.status === "delivered").length;
  const isActive = driver.status === "active";

  const requiredFilled =
    form.firstName.trim() && form.phone.trim() && form.cin.trim() && form.vehicleType;

  const zonesDirty = JSON.stringify([...zoneIds].sort()) !== JSON.stringify([...(driver.deliveryZoneIds || [])].sort());
  const fieldsDirty =
    form.firstName !== driver.firstName || 
    form.phone !== driver.phone ||
    form.cin !== driver.cin ||
    form.email !== (driver.email || "") ||
    form.address !== (driver.address || "") ||
    form.vehicleType !== driver.vehicleType ||
    form.vehicleBrand !== (driver.vehicleBrand || "") ||
    form.vehicleModel !== (driver.vehicleModel || "") ||
    form.plateNumber !== (driver.plateNumber || "") ||
    form.drivingLicenseNumber !== (driver.drivingLicenseNumber || "");
  const isDirty = fieldsDirty || zonesDirty;

  async function handleSave() {
    if (!requiredFilled) {
      setError("Merci de remplir les champs obligatoires (prénom, nom, téléphone, CIN, type de véhicule).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateDriver(driver!.id, {
        firstName: form!.firstName.trim(),
        lastName: form!.lastName.trim(),
        phone: form!.phone.trim(),
        cin: form!.cin.trim(),
        email: form!.email.trim() || undefined,
        address: form!.address.trim() || undefined,
        vehicleType: form!.vehicleType as VehicleType,
        vehicleBrand: form!.vehicleBrand.trim() || undefined,
        vehicleModel: form!.vehicleModel.trim() || undefined,
        plateNumber: form!.plateNumber.trim() || undefined,
        drivingLicenseNumber: form!.drivingLicenseNumber.trim() || undefined,
        deliveryZoneIds: zoneIds,
      });
      showToast("Informations mises à jour", "success");
    } catch (err) {
      setError(companyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setTogglingStatus(true);
    try {
      await updateDriver(driver!.id, { status: isActive ? "inactive" : "active" });
      showToast(isActive ? "Compte désactivé" : "Compte activé", "success");
    } catch (err) {
      showToast(companyErrorMessage(err), "warning");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeDriver(driver!.id);
      showToast("Livreur supprimé", "success");
      navigate("/company/drivers");
    } catch (err) {
      showToast(companyErrorMessage(err), "warning");
      setDeleting(false);
    }
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <span className="font-display text-lg font-bold">
              {form.firstName.charAt(0)}
              {form.lastName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-950">{companyDriverFullName(driver)}</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              {driver.id} · Depuis { driver.createdAt }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        <Link to={`/company/driver-settlement?driverId=${encodeURIComponent(driver.id)}`}>
          <Button variant="outline">
            <HandCoins className="h-4 w-4" /> Clôturer la tournée
          </Button>
        </Link>
        {/* Activate / deactivate toggle */}
        <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-card">
          <span className={`text-sm font-semibold ${isActive ? "text-go-600" : "text-ink-400"}`}>
            {isActive ? "Compte actif" : "Compte désactivé"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={togglingStatus}
            onClick={handleToggleActive}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
              isActive ? "bg-go-500" : "bg-ink-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        </div>
      </div>

      {/* Brief stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox icon={Package} label="Livraisons en cours" value={String(activeDeliveries)} />
        <StatBox icon={CheckCircle2} label="Livraisons terminées" value={String(completedDeliveries)} />
        <StatBox icon={MapPin} label="Zones couvertes" value={String(driver.deliveryZoneIds?.length || 0)} />
        <StatBox icon={Calendar} label="Membre depuis" value={ (driver.createdAt)} />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Editable info */}
        <div className="space-y-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Identité</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nom & prénom" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
              <Input label="Numéro CIN" value={form.cin} onChange={(e) => update("cin", e.target.value)} required />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <Input label="Adresse" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Véhicule</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  Type de véhicule <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => update("vehicleType", e.target.value as VehicleType)}
                  required
                  className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_TYPE_LABELS[v]}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Marque" value={form.vehicleBrand} onChange={(e) => update("vehicleBrand", e.target.value)} />
              <Input label="Modèle" value={form.vehicleModel} onChange={(e) => update("vehicleModel", e.target.value)} />
              <Input label="Numéro de plaque" value={form.plateNumber} onChange={(e) => update("plateNumber", e.target.value)} />
              <Input
                label="Numéro de permis de conduire"
                value={form.drivingLicenseNumber}
                onChange={(e) => update("drivingLicenseNumber", e.target.value)}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Zones de livraison</h3>
            <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-brand-500" />
                <p className="text-sm text-ink-600">
                  Associez ce livreur à une ou plusieurs zones de livraison.
                </p>
              </div>

              {zoneIds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {zoneIds.map((zid) => (
                    <span
                      key={zid}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
                    >
                      {zoneName(zid)}
                      <button
                        type="button"
                        onClick={() => removeZoneId(zid)}
                        className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                        aria-label={`Retirer la zone ${zoneName(zid)}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setZonePickerOpen((o) => !o)}
                  disabled={availableZones.length === 0}
                  className="flex w-full items-center justify-between rounded-xl border border-ink-300 bg-white px-4 py-3 text-left text-[15px] text-ink-700 disabled:cursor-not-allowed disabled:opacity-50 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                >
                  <span>
                    {availableZones.length === 0
                      ? zoneIds.length === 0
                        ? "Aucune zone disponible"
                        : "Toutes les zones sont déjà associées"
                      : "Ajouter une zone de livraison…"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-ink-400" />
                </button>

                {zonePickerOpen && availableZones.length > 0 && (
                  <div className="absolute z-10 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
                    {availableZones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => addZoneId(z.id)}
                        disabled={!z.isActive}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-300"
                      >
                        <span>{z.name}</span>
                        {!z.isActive && <span className="text-xs text-ink-400">Inactive</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 border-t border-ink-100 pt-5">
            <Button onClick={handleSave} disabled={!requiredFilled || !isDirty || saving}>
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
            {isDirty && !saving && (
              <span className="text-xs text-ink-500">Modifications non enregistrées</span>
            )}
          </div>
        </div>

        {/* Read-only quick summary + danger zone */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 font-display font-semibold text-ink-900">Résumé</h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Phone} label="Téléphone" value={driver.phone} />
              {driver.email && <Row icon={Mail} label="Email" value={driver.email} />}
              <Row icon={BadgeCheck} label="CIN" value={driver.cin} />
              <Row
                icon={Car}
                label="Véhicule"
                value={`${VEHICLE_TYPE_LABELS[driver.vehicleType]}${driver.plateNumber ? ` · ${driver.plateNumber}` : ""}`}
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
            <h2 className="mb-2 font-display font-semibold text-ink-900">Zone de danger</h2>
            <p className="mb-3 text-sm text-ink-500">La suppression d'un livreur est définitive et retire son accès à l'application.</p>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="danger" fullWidth disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Suppression..." : "Confirmer la suppression"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Annuler
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Supprimer ce livreur
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 text-center shadow-card">
      <Icon className="mx-auto mb-1.5 h-4.5 w-4.5 text-brand-500" />
      <p className="font-display text-lg font-bold text-ink-950">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
      <div>
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="font-medium text-ink-900">{value}</dd>
      </div>
    </div>
  );
}
