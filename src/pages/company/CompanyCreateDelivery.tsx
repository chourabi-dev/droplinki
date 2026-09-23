import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, MessageCircle, Check, PackagePlus, AlertCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useCompanyDeliveries } from "@/context/CompanyDeliveryContext";
import { companyErrorMessage } from "@/context/CompanyDriverContext";
import { useCompanyDrivers } from "@/context/CompanyDriverContext";
import { useToast } from "@/context/ToastContext";
import { CompanyDelivery } from "@/types";
import { whatsappUrl } from "@/lib/utils";

export default function CompanyCreateDelivery() {
  const navigate = useNavigate();
  const { createDelivery } = useCompanyDeliveries();
  const { drivers } = useCompanyDrivers();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedDriverId, setAssignedDriverId] = useState("");
  const [created, setCreated] = useState<CompanyDelivery | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const delivery = await createDelivery({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        reference: reference.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        assignedDriverId: assignedDriverId || undefined,
      });
      setCreated(delivery);
    } catch (err) {
      const message = companyErrorMessage(err);
      setError(message);
      showToast(message, "warning");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    const fullLink = `${window.location.origin}${created.shareUrl}`;
    const message = `🚚 Votre livraison est en route.\nOuvrez ce lien et partagez votre position avec le livreur :\n${fullLink}`;

    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-go-50 text-go-500 animate-check-pop">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Livraison créée</h1>
          <p className="mt-1.5 text-ink-500">
            Envoyez ce lien à <span className="font-semibold text-ink-900">{created.customerName}</span> pour qu'il partage sa position.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{created.id}</p>
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
            <p className="flex-1 truncate text-sm font-medium text-ink-900">{fullLink}</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard?.writeText(fullLink);
                setCopied(true);
                showToast("Lien copié dans le presse-papiers", "success");
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4 text-go-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier le lien"}
            </Button>
            <a href={whatsappUrl(created.customerPhone, message)} target="_blank" rel="noreferrer" onClick={() => showToast("WhatsApp ouvert", "info")}>
              <Button variant="success" fullWidth>
                <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" fullWidth onClick={() => navigate(`/company/deliveries/${created.id}`)}>
            Voir la livraison
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setCreated(null);
              setCustomerName("");
              setCustomerPhone("");
              setReference("");
              setAmount("");
              setAddress("");
              setNotes("");
              setAssignedDriverId("");
            }}
          >
            <PackagePlus className="h-4 w-4" /> Créer une autre livraison
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Nouvelle livraison</h1>
          <p className="mt-1.5 text-ink-500">Quelques infos suffisent — le lien est généré instantanément.</p>
        </div>
      </div>

      <Link to="/company/deliveries/import" className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
        <UploadCloud className="h-4 w-4" /> Vous avez plusieurs commandes ? Importez un fichier CSV
      </Link>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <Input label="Nom du client" placeholder="Ahmed Trabelsi" value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoFocus required />
        <Input
          label="Téléphone du client"
          type="tel"
          placeholder="+216 20 123 456"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          hint="Utilisé pour le lien de suivi et pour appeler le client si besoin."
          required
        />
        <Input label="Adresse connue (optionnel)" placeholder="12 Rue de Marseille, Tunis" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Numéro de commande / référence (optionnel)" placeholder="CMD-8821" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input label="Montant à encaisser (optionnel)" type="number" placeholder="45" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <div className="w-full">
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Assigner à un livreur (optionnel)</label>
          <select
            value={assignedDriverId}
            onChange={(e) => setAssignedDriverId(e.target.value)}
            className="w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          >
            <option value="">Non assigné pour l'instant</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <Textarea label="Notes (optionnel)" placeholder="Sonner à l'interphone, 2e étage..." rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button type="submit" fullWidth disabled={!customerName.trim() || !customerPhone.trim() || submitting}>
          <PackagePlus className="h-4 w-4" /> {submitting ? "Création..." : "Créer la livraison"}
        </Button>
      </form>
    </div>
  );
}
