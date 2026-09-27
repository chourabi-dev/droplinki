import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Trash2, Package, CheckCircle2, Phone, Mail, MapPin, AlertCircle, Contact, IdCard } from "lucide-react";
import { useCompanyClients, companyClientErrorMessage } from "@/context/CompanyClientContext";
import { GovernorateDelegationPicker } from "@/components/company/GovernorateDelegationPicker";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clientFullName } from "@/types";

interface EditableFields {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  taxId: string;
  governorateId: string | null;
  delegationId: string | null;
  address: string;
}

export default function CompanyClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, updateClient, removeClient, isLoading } = useCompanyClients();
  const { showToast } = useToast();

  const client = id ? getClient(id) : undefined;

  const [form, setForm] = useState<EditableFields | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email,
      taxId: client.taxId || "",
      governorateId: client.governorateId || null,
      delegationId: client.delegationId || null,
      address: client.address || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  if (isLoading && !client) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!client || !form) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">Client introuvable</p>
        <p className="mt-1 text-ink-500">Ce client n'existe pas ou plus.</p>
        <Link to="/company/clients" className="mt-5 inline-block">
          <Button variant="outline">Retour aux clients</Button>
        </Link>
      </div>
    );
  }

  function update<K extends keyof EditableFields>(key: K, value: EditableFields[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  const isActive = client.status === "active";
  const requiredFilled =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim() && 
    form.taxId.trim() &&
    form.governorateId &&
    form.delegationId &&
    form.address.trim();
  const isDirty =
    form.firstName !== client.firstName ||
    form.lastName !== client.lastName ||
    form.phone !== client.phone || 
    form.taxId !== (client.taxId || "") ||
    form.governorateId !== (client.governorateId || null) ||
    form.delegationId !== (client.delegationId || null) ||
    form.address !== (client.address || "");

  async function handleSave() {
    if (!requiredFilled) {
      setError("Merci de remplir les champs obligatoires (identité, CIN/matricule fiscale, et adresse complète).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateClient(client!.id, {
        firstName: form!.firstName.trim(),
        lastName: form!.lastName.trim(),
        phone: form!.phone.trim(), 
        taxId: form!.taxId.trim(),
        governorateId: form!.governorateId!,
        delegationId: form!.delegationId!,
        address: form!.address.trim(),
      });
      showToast("Informations mises à jour", "success");
    } catch (err) {
      setError(companyClientErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    setTogglingStatus(true);
    try {
      await updateClient(client!.id, { status: isActive ? "inactive" : "active" });
      showToast(isActive ? "Compte désactivé" : "Compte activé", "success");
    } catch (err) {
      showToast(companyClientErrorMessage(err), "warning");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeClient(client!.id);
      showToast("Client supprimé", "success");
      navigate("/company/clients");
    } catch (err) {
      showToast(companyClientErrorMessage(err), "warning");
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
            <h1 className="font-display text-2xl font-bold text-ink-950">{clientFullName(client)}</h1>
            <p className="mt-0.5 text-sm text-ink-500">{client.id}</p>
          </div>
        </div>

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

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatBox icon={Package} label="Livraisons en cours" value={String(client.activeDeliveries ?? 0)} />
        <StatBox icon={CheckCircle2} label="Livraisons terminées" value={String(client.completedDeliveries ?? 0)} />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Identité</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Prénom" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
              <Input label="Nom" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            
              <Input
                label="CIN / Matricule fiscale"
                value={form.taxId}
                onChange={(e) => update("taxId", e.target.value)}
                required
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Adresse (utilisée pour les enlèvements)</h3>
            <div className="space-y-4">
              <GovernorateDelegationPicker
                governorateId={form.governorateId}
                delegationId={form.delegationId}
                onGovernorateChange={(id) => update("governorateId", id)}
                onDelegationChange={(id) => update("delegationId", id)}
                required
              />
              <Input label="Adresse" value={form.address} onChange={(e) => update("address", e.target.value)} required />
            </div>
          </section>

          <div className="flex items-center gap-2 border-t border-ink-100 pt-5">
            <Button onClick={handleSave} disabled={!requiredFilled || !isDirty || saving}>
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
            {isDirty && !saving && <span className="text-xs text-ink-500">Modifications non enregistrées</span>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display font-semibold text-ink-900">
              <Contact className="h-4 w-4 text-ink-400" /> Résumé
            </h2>
            <dl className="space-y-3 text-sm">
              <Row icon={Phone} label="Téléphone" value={client.phone} />
              <Row icon={Mail} label="Email" value={client.email} />
              {client.taxId && <Row icon={IdCard} label="CIN / Matricule fiscale" value={client.taxId} />}
              {client.address && (
                <Row
                  icon={MapPin}
                  label="Adresse"
                  value={[client.address, client.delegationName, client.governorateName].filter(Boolean).join(", ")}
                />
              )}
            </dl>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
            <h2 className="mb-2 font-display font-semibold text-ink-900">Zone de danger</h2>
            <p className="mb-3 text-sm text-ink-500">La suppression d'un client est définitive et retire son accès à l'application.</p>
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
                <Trash2 className="h-4 w-4" /> Supprimer ce client
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
