import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, AlertCircle, Contact, X, ChevronRight, Eye } from "lucide-react";
import { useCompanyClients, companyClientErrorMessage } from "@/context/CompanyClientContext";
import { GovernorateDelegationPicker } from "@/components/company/GovernorateDelegationPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/context/ToastContext";
import { Client, clientFullName } from "@/types";
import { CreateCompanyClientInput } from "@/lib/companyApi";

const STATUS_LABELS: Record<Client["status"], string> = {
  active: "Actif",
  invited: "Invité",
  inactive: "Inactif",
};
const STATUS_TINTS: Record<Client["status"], string> = {
  active: "bg-go-50 text-go-600",
  invited: "bg-warn-50 text-warn-600",
  inactive: "bg-ink-100 text-ink-500",
};

export default function CompanyClients() {
  const { clients, isLoading, error, addClient } = useCompanyClients();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Clients</h1>
          <p className="mt-1 text-ink-500">Gérez les comptes expéditeurs qui peuvent créer des livraisons pour votre compte.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Ajouter un client
        </Button>
      </div>

      {showForm && <AddClientForm onClose={() => setShowForm(false)} onCreate={addClient} />}

      {isLoading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-red-200 bg-red-50 px-6 py-14 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
          <p className="font-display font-semibold text-ink-900">Impossible de charger les clients</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">{error}</p>
        </div>
      ) : clients.length === 0 && !showForm ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Contact className="h-6 w-6" />
          </div>
          <p className="font-display font-semibold text-ink-900">Aucun client pour l'instant</p>
          <p className="mt-1 max-w-xs text-sm text-ink-500">
            Ajoutez vos clients (expéditeurs) pour qu'ils puissent se connecter et créer leurs propres livraisons.
          </p>
          <Button size="sm" className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Ajouter un client
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Téléphone</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Email</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Livraisons en cours</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {clients.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-ink-50" onClick={() => navigate(`/company/clients/${c.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Contact className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-900">{clientFullName(c)}</p>
                        <p className="text-xs text-ink-500">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{c.phone}</td>
                  <td className="hidden px-4 py-3 text-ink-600 md:table-cell">{c.email}</td>
                  <td className="hidden px-4 py-3 text-ink-500 sm:table-cell">{c.activeDeliveries ?? 0} livraison(s)</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TINTS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/company/clients/${c.id}`)}
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600"
                        aria-label="Voir le profil"
                        title="Voir le profil"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-ink-300" />
                    </div>
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

interface ClientFormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  taxId: string;
  governorateId: string | null;
  delegationId: string | null;
  address: string;
}

const EMPTY_FORM: ClientFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  taxId: "",
  governorateId: null,
  delegationId: null,
  address: "",
};

function AddClientForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreateCompanyClientInput) => Promise<Client>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const requiredFilled =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim() &&
    form.email.trim() &&
    form.taxId.trim() &&
    form.governorateId &&
    form.delegationId &&
    form.address.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requiredFilled) {
      setError("Merci de remplir tous les champs obligatoires, y compris l'adresse (gouvernorat, délégation, adresse).");
      return;
    }

    setLoading(true);
    try {
      await onCreate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        taxId: form.taxId.trim(),
        governorateId: form.governorateId!,
        delegationId: form.delegationId!,
        address: form.address.trim(),
      });
      showToast("Client ajouté — ses identifiants de connexion lui ont été envoyés par email.", "success");
      onClose();
    } catch (err) {
      setError(companyClientErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900">Ajouter un client</h2>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Identité</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Prénom" placeholder="Sami" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required autoFocus />
              <Input label="Nom" placeholder="Ben Ali" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
              <Input label="Téléphone" type="tel" placeholder="+216 20 123 456" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
              <Input label="Email" type="email" placeholder="client@exemple.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              <Input
                label="CIN / Matricule fiscale"
                placeholder="07123456 ou 1234567/A/M/000"
                value={form.taxId}
                onChange={(e) => update("taxId", e.target.value)}
                hint="Carte d'identité nationale (particulier) ou matricule fiscale (entreprise)."
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
              <Input
                label="Adresse"
                placeholder="12 Rue de Marseille, immeuble X, 2e étage"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                required
              />
            </div>
          </section>

          <p className="rounded-xl border border-ink-200 bg-ink-50 p-3 text-xs text-ink-500">
            Le mot de passe du client est généré automatiquement et lui est envoyé par email avec son identifiant de connexion.
          </p>

          <div className="flex gap-2 border-t border-ink-100 pt-5">
            <Button type="submit" disabled={!requiredFilled || loading}>
              {loading ? "Ajout..." : "Ajouter le client"}
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
