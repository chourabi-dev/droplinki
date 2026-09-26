import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, MessageCircle, Check, PackagePlus, AlertCircle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useClientDeliveries, clientDeliveryErrorMessage } from "@/context/ClientDeliveryContext";
import { useToast } from "@/context/ToastContext";
import { ClientDelivery, clientDeliveryRecipientFullName } from "@/types";
import { whatsappUrl } from "@/lib/utils";

export default function ClientCreateDelivery() {
  const navigate = useNavigate();
  const { createDelivery } = useClientDeliveries();
  const { showToast } = useToast();

  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientPhone1, setRecipientPhone1] = useState("");
  const [recipientPhone2, setRecipientPhone2] = useState("");
  const [address, setAddress] = useState("");
  const [helpText, setHelpText] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [generateValidationLink, setGenerateValidationLink] = useState(true);
  const [created, setCreated] = useState<ClientDelivery | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredFilled = recipientFirstName.trim() && recipientLastName.trim() && recipientPhone1.trim() && address.trim();

  function resetForm() {
    setRecipientFirstName("");
    setRecipientLastName("");
    setRecipientPhone1("");
    setRecipientPhone2("");
    setAddress("");
    setHelpText("");
    setReference("");
    setAmount("");
    setGenerateValidationLink(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const delivery = await createDelivery({
        recipientFirstName: recipientFirstName.trim(),
        recipientLastName: recipientLastName.trim(),
        recipientPhone1: recipientPhone1.trim(),
        recipientPhone2: recipientPhone2.trim() || undefined,
        address: address.trim(),
        helpText: helpText.trim() || undefined,
        reference: reference.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        generateValidationLink,
      });
      setCreated(delivery);
    } catch (err) {
      const message = clientDeliveryErrorMessage(err);
      setError(message);
      showToast(message, "warning");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    const hasLink = created.hasValidationLink && !!created.shareUrl;
    const fullLink = hasLink ? `${window.location.origin}${created.shareUrl}` : "";
    const message = `🚚 Une livraison est en route pour vous.\nOuvrez ce lien et partagez votre position :\n${fullLink}`;

    return (
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-go-50 text-go-500 animate-check-pop">
            <Check className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Livraison créée</h1>
          <p className="mt-1.5 text-ink-500">
            {hasLink ? (
              <>
                Envoyez ce lien à <span className="font-semibold text-ink-900">{clientDeliveryRecipientFullName(created)}</span> pour
                qu'il/elle partage sa position.
              </>
            ) : (
              <>
                La livraison pour <span className="font-semibold text-ink-900">{clientDeliveryRecipientFullName(created)}</span> a été
                enregistrée.
              </>
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{created.id}</p>

          {hasLink ? (
            <>
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
                <a href={whatsappUrl(created.recipientPhone1, message)} target="_blank" rel="noreferrer" onClick={() => showToast("WhatsApp ouvert", "info")}>
                  <Button variant="success" fullWidth>
                    <MessageCircle className="h-4 w-4" /> Envoyer sur WhatsApp
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-500">
              Aucun lien de validation n'a été généré pour cette livraison. Vous pourrez toujours en générer un plus tard depuis le détail
              de la livraison.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" fullWidth onClick={() => navigate(`/client/deliveries/${created.id}`)}>
            Voir la livraison
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setCreated(null);
              resetForm();
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
          <p className="mt-1.5 text-ink-500">Renseignez les informations du destinataire.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Destinataire</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Prénom"
              placeholder="Amine"
              value={recipientFirstName}
              onChange={(e) => setRecipientFirstName(e.target.value)}
              autoFocus
              required
            />
            <Input label="Nom" placeholder="Gharbi" value={recipientLastName} onChange={(e) => setRecipientLastName(e.target.value)} required />
            <Input
              label="Téléphone 1"
              type="tel"
              placeholder="+216 20 123 456"
              value={recipientPhone1}
              onChange={(e) => setRecipientPhone1(e.target.value)}
              hint="Utilisé pour le lien de suivi et pour l'appeler si besoin."
              required
            />
            <Input
              label="Téléphone 2 (optionnel)"
              type="tel"
              placeholder="+216 55 987 654"
              value={recipientPhone2}
              onChange={(e) => setRecipientPhone2(e.target.value)}
              hint="Un second numéro de contact, au cas où."
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Adresse</h3>
          <div className="space-y-4">
            <Textarea
              label="Adresse"
              placeholder="12 Rue de Marseille, Tunis"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
            <Textarea
              label="Aide pour trouver l'adresse (optionnel)"
              placeholder="Ex. immeuble bleu, 2e étage, sonner à l'interphone..."
              rows={2}
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Détails (optionnel)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Référence / commande" placeholder="CMD-8821" value={reference} onChange={(e) => setReference(e.target.value)} />
            <Input label="Montant à encaisser" type="number" placeholder="45" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </section>

        <section>
          <label className="flex items-start gap-2.5 rounded-xl border border-ink-200 bg-ink-50 p-3.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={generateValidationLink}
              onChange={(e) => setGenerateValidationLink(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="flex items-center gap-1.5 font-medium text-ink-900">
                <Link2 className="h-3.5 w-3.5" /> Générer un lien de validation
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                Un lien à envoyer au destinataire pour qu'il confirme la livraison et partage sa position exacte.
              </span>
            </span>
          </label>
        </section>

        <Button type="submit" fullWidth disabled={!requiredFilled || submitting}>
          <PackagePlus className="h-4 w-4" /> {submitting ? "Création..." : "Créer la livraison"}
        </Button>
      </form>
    </div>
  );
}
