import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, MessageCircle, Check, PackagePlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useDeliveries, deliveryErrorMessage } from "@/context/DeliveryContext";
import { useToast } from "@/context/ToastContext";
import { Delivery } from "@/types";
import { whatsappUrl } from "@/lib/utils";

export default function CreateDelivery() {
  const navigate = useNavigate();
  const { createDelivery } = useDeliveries();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<Delivery | null>(null);
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
        notes: notes.trim() || undefined,
      });
      setCreated(delivery);
    } catch (err) {
      const message = deliveryErrorMessage(err);
      setError(message);
      showToast(message, "warning");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    console.log(created,"oh shit babdy");
    
    const fullLink = `${window.location.origin}/d/${created.id}`;
    const message = `🚚 Votre livraison est en route.\nOuvrez ce lien et partagez votre position avec votre livreur :\n${fullLink}`;

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
            <a
              href={whatsappUrl(created.customerPhone, message)}
              target="_blank"
              rel="noreferrer"
              onClick={() => showToast("WhatsApp ouvert", "info")}
            >
              <Button variant="success" fullWidth>
                <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" fullWidth onClick={() => navigate(`/deliveries/${created.id}`)}>
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
              setNotes("");
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
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="font-display text-2xl font-bold text-ink-950">Nouvelle livraison</h1>
      <p className="mt-1.5 text-ink-500">Quelques infos suffisent — le lien est généré instantanément.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <Input
          label="Nom du client"
          placeholder="Ahmed Trabelsi"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          autoFocus
          required
        />
        <Input
          label="Téléphone du client"
          type="tel"
          placeholder="+216 20 123 456"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          hint="Utilisé pour envoyer le lien de suivi par WhatsApp/SMS."
          required
        />
        <Input
          label="Numéro de commande / référence (optionnel)"
          placeholder="CMD-8821"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <Input
          label="Montant à encaisser (optionnel)"
          type="number"
          placeholder="45"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Textarea
          label="Notes (optionnel)"
          placeholder="Sonner à l'interphone, 2e étage..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button type="submit" fullWidth disabled={!customerName.trim() || !customerPhone.trim() || submitting}>
          <PackagePlus className="h-4 w-4" /> {submitting ? "Création..." : "Créer la livraison"}
        </Button>
      </form>
    </div>
  );
}
