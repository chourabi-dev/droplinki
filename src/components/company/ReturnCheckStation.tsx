import { useEffect, useRef, useState } from "react";
import {
  LucideIcon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Loader2,
  MapPinned,
  Package,
  Phone,
  PhoneCall,
  RotateCcw,
  ScanLine,
  ScanSearch,
  Wallet,
  XCircle,
} from "lucide-react";
import { companyStationsApi, ApiError, isNetworkError } from "@/lib/companyApi";
import { useScannerCapture } from "@/hooks/useScannerCapture";
import { StatusBadge } from "@/components/StatusBadge";
import { JournalTimeline } from "@/components/JournalTimeline";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { formatAmount, formatDateTime } from "@/lib/utils";
import {
  CALL_OUTCOME_LABELS,
  ClientDelivery,
  PublicCompanyInfo,
  RETURN_CHECK_DESCRIPTION,
  RETURN_CHECK_LABEL,
  ReturnCheckDecision,
  clientDeliveryRecipientFullName,
} from "@/types";
import logo from "@/assets/logo.png";

type Phase = "idle" | "loading" | "loaded" | "error";

/** Only a package that came back after a failed delivery is waiting for a decision. */
const AWAITING_DECISION_STATUS = "EN-DEP-FAILD";

/**
 * Unauthenticated station screen — "Contrôle des retours". Reachable at
 * /company/:companyId/station/return-check with no login, on a device plugged
 * to a laser scanner (see useScannerCapture).
 *
 * Flow: scan a package → its full history is loaded and displayed (journal,
 * calls, reschedules) → the employee decides to return it to the sender
 * (canceled for good) or to send it out again. Scanning another package at any
 * moment replaces the one on screen.
 */
export function ReturnCheckStation({ companyId }: { companyId: string }) {
  const [company, setCompany] = useState<PublicCompanyInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scannedCode, setScannedCode] = useState("");
  const [delivery, setDelivery] = useState<ClientDelivery | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Decision state
  const [mode, setMode] = useState<ReturnCheckDecision | null>(null);
  const [note, setNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ReturnCheckDecision | null>(null);

  // Only the latest scan may write to the screen (an earlier, slower lookup must not overwrite it).
  const scanSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    companyStationsApi
      .getPublicInfo(companyId)
      .then((c) => !cancelled && setCompany(c))
      .catch(() => {
        /* name is cosmetic — the header falls back to a generic label */
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  function resetDecision() {
    setMode(null);
    setNote("");
    setDecisionError(null);
    setOutcome(null);
  }

  function clearScreen() {
    scanSeq.current++;
    resetDecision();
    setDelivery(null);
    setError(null);
    setScannedCode("");
    setPhase("idle");
  }

  useScannerCapture(
    async (packageId) => {
      const seq = ++scanSeq.current;
      resetDecision();
      setScannedCode(packageId);
      setDelivery(null);
      setError(null);
      setPhase("loading");
      try {
        const found = await companyStationsApi.lookupReturnCheck(companyId, packageId);
        if (seq !== scanSeq.current) return;
        setDelivery(found);
        setPhase("loaded");
      } catch (err) {
        if (seq !== scanSeq.current) return;
        setError(lookupErrorMessage(err, packageId));
        setPhase("error");
      }
    },
    // Don't let a stray scan swap the package while a decision is being saved.
    { minLength: 3, enabled: !deciding }
  );

  async function submitDecision() {
    if (!delivery || !mode) return;
    const seq = scanSeq.current;
    setDeciding(true);
    setDecisionError(null);
    try {
      const updated = await companyStationsApi.decideReturnCheck(companyId, delivery.id, {
        decision: mode,
        note: note.trim() || undefined,
      });
      if (seq !== scanSeq.current) return;
      setDelivery(updated);
      setOutcome(mode);
      setMode(null);
      setNote("");
    } catch (err) {
      if (seq !== scanSeq.current) return;
      setDecisionError(decisionErrorMessage(err));
    } finally {
      setDeciding(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 sm:px-10">
        <img src={logo} width={140} alt="DropLink" className="brightness-0 invert" />
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{company?.name ?? "Chargement..."}</p>
          <p className="text-xs text-ink-300">Station · {RETURN_CHECK_LABEL}</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-10">
        {phase === "idle" && <Placeholder tone="idle" title={RETURN_CHECK_LABEL} text={RETURN_CHECK_DESCRIPTION} />}

        {phase === "loading" && (
          <Placeholder tone="loading" title="Chargement de l'historique..." text={`Colis ${scannedCode}`} />
        )}

        {phase === "error" && (
          <Placeholder tone="error" title="Colis non consulté" text={error ?? "Une erreur inattendue est survenue."} hint="Scannez un colis pour réessayer." />
        )}

        {phase === "loaded" && delivery && (
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-ink-300">
                <ScanLine className="h-4 w-4" />
                Scannez un autre colis pour changer de dossier.
              </div>
              <Button size="sm" variant="ghost" className="text-ink-300 hover:bg-white/10" onClick={clearScreen} disabled={deciding}>
                Fermer ce dossier
              </Button>
            </div>

            <div className="grid items-start gap-5 text-ink-900 lg:grid-cols-[1fr_1.1fr]">
              {/* Package summary */}
              <section className="rounded-2xl bg-white p-5 shadow-card lg:col-start-1 lg:row-start-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="truncate font-display text-xl font-bold">{clientDeliveryRecipientFullName(delivery) || "Destinataire"}</h1>
                    <p className="text-sm text-ink-500">{delivery.id}</p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>

                <dl className="mt-4 space-y-3 text-sm">
                  <InfoRow icon={Phone} label="Téléphone" value={[delivery.recipientPhone1, delivery.recipientPhone2].filter(Boolean).join(" / ") || "—"} />
                  <InfoRow
                    icon={MapPinned}
                    label="Adresse"
                    value={[delivery.address, delivery.delegationName, delivery.governorateName].filter(Boolean).join(", ") || "—"}
                  />
                  {delivery.designation && <InfoRow icon={Package} label="Désignation" value={delivery.designation} />}
                  {delivery.amount !== undefined && <InfoRow icon={Wallet} label="Montant à encaisser" value={formatAmount(delivery.amount)} />}
                  <InfoRow icon={RotateCcw} label="Tentatives relancées" value={String(delivery.rescheduleCount ?? 0)} />
                  {delivery.rescheduleReason?.trim() && <InfoRow icon={AlertTriangle} label="Motif du dernier échec / report" value={delivery.rescheduleReason.trim()} />}
                </dl>
              </section>

              <div className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                {/* Journal — the package's history */}
                <section className="rounded-2xl bg-white p-5 shadow-card">
                  <h2 className="mb-4 font-display font-semibold">Journal du colis</h2>
                  <JournalTimeline entries={delivery.journal} />
                </section>

                {/* Call attempts */}
                {(delivery.callAttempts?.length ?? 0) > 0 && (
                  <section className="rounded-2xl bg-white p-5 shadow-card">
                    <h2 className="mb-4 flex items-center gap-2 font-display font-semibold">
                      <PhoneCall className="h-4 w-4 text-ink-500" /> Appels au client
                    </h2>
                    <ul className="space-y-3 text-sm">
                      {[...delivery.callAttempts].reverse().map((call) => (
                        <li key={call.id}>
                          <p className="font-medium">{CALL_OUTCOME_LABELS[call.outcome]}</p>
                          {call.note && <p className="text-xs text-ink-500">{call.note}</p>}
                          <p className="text-xs text-ink-500">{formatDateTime(call.timestamp)}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Decision */}
              <section className="lg:col-start-1 lg:row-start-2">
                <DecisionPanel
                  delivery={delivery}
                  mode={mode}
                  note={note}
                  deciding={deciding}
                  outcome={outcome}
                  error={decisionError}
                  onPick={(m) => {
                    setDecisionError(null);
                    setMode(m);
                  }}
                  onNote={setNote}
                  onBack={() => {
                    setMode(null);
                    setDecisionError(null);
                  }}
                  onConfirm={submitDecision}
                  onNext={clearScreen}
                />
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function DecisionPanel({
  delivery,
  mode,
  note,
  deciding,
  outcome,
  error,
  onPick,
  onNote,
  onBack,
  onConfirm,
  onNext,
}: {
  delivery: ClientDelivery;
  mode: ReturnCheckDecision | null;
  note: string;
  deciding: boolean;
  outcome: ReturnCheckDecision | null;
  error: string | null;
  onPick: (m: ReturnCheckDecision) => void;
  onNote: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  onNext: () => void;
}) {
  // Decision just saved: confirm it, the journal on the side already shows the new entry.
  if (outcome) {
    return (
      <div className="rounded-2xl border border-go-500/30 bg-go-50 p-5 shadow-card">
        <p className="flex items-center gap-2 font-display font-semibold text-go-600">
          <CheckCircle2 className="h-5 w-5" />
          {outcome === "return" ? "Colis retourné à l'expéditeur" : "Colis renvoyé en livraison"}
        </p>
        <p className="mt-1 text-sm text-ink-700">La décision a été enregistrée dans le journal du colis.</p>
        <Button className="mt-4" fullWidth onClick={onNext}>
          <ScanLine className="h-4 w-4" /> Scanner le colis suivant
        </Button>
      </div>
    );
  }

  if (delivery.status !== AWAITING_DECISION_STATUS) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-warn-500/30 bg-warn-50 p-5 text-sm text-ink-900 shadow-card">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-600" />
        <p>
          Ce colis n'attend pas de décision de retour : seuls les colis revenus au dépôt après un échec de livraison peuvent être
          retournés ou renvoyés.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-card">
      <h2 className="font-display font-semibold">Que faire de ce colis ?</h2>
      <p className="mt-1 text-sm text-ink-500">Consultez le journal, puis choisissez.</p>

      {mode === null && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => onPick("resend")}>
            <RotateCcw className="h-4 w-4" /> Renvoyer en livraison
          </Button>
          <Button className="flex-1" variant="danger" onClick={() => onPick("return")}>
            <Ban className="h-4 w-4" /> Retourner à l'expéditeur
          </Button>
        </div>
      )}

      {mode !== null && (
        <div className="mt-4 space-y-3">
          <p className={mode === "return" ? "text-sm font-medium text-red-600" : "text-sm font-medium text-ink-700"}>
            {mode === "return"
              ? "Action définitive : le colis sera annulé, retourné à l'expéditeur et ses frais de retour seront déduits du prochain versement."
              : "Le colis repartira pour une nouvelle tentative de livraison."}
          </p>
          <Textarea
            label="Note (optionnel)"
            rows={2}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder={mode === "return" ? "Ex. client injoignable après 3 tentatives" : "Ex. client rappelé, disponible demain"}
          />
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant={mode === "return" ? "secondary" : "primary"} fullWidth disabled={deciding} onClick={onConfirm}>
              {deciding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : mode === "return" ? (
                "Confirmer le retour"
              ) : (
                "Confirmer le renvoi"
              )}
            </Button>
            <Button variant="ghost" disabled={deciding} onClick={onBack}>
              Retour
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ tone, title, text, hint }: { tone: "idle" | "loading" | "error"; title: string; text: string; hint?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div
        className={
          "flex h-40 w-40 items-center justify-center rounded-full ring-8 transition-all duration-300 sm:h-48 sm:w-48 " +
          (tone === "idle" ? "bg-brand-600 ring-brand-500/30" : tone === "loading" ? "animate-pulse bg-ink-700 ring-white/10" : "bg-red-600 ring-red-500/30")
        }
      >
        {tone === "idle" && <ScanSearch className="h-16 w-16 text-white" />}
        {tone === "loading" && <Loader2 className="h-16 w-16 animate-spin text-white" />}
        {tone === "error" && <XCircle className="h-16 w-16 text-white" strokeWidth={2.5} />}
      </div>
      <h1 className="mt-8 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-md text-ink-300">{text}</p>
      <div className="mt-6 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-ink-300">
        <ScanLine className="h-4 w-4" />
        {hint ?? (tone === "loading" ? "Récupération du dossier..." : "En attente d'un scan...")}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="break-words font-medium text-ink-900">{value}</dd>
      </div>
    </div>
  );
}

function lookupErrorMessage(err: unknown, packageId: string): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return `Aucun colis « ${packageId} » trouvé pour cette entreprise.`;
    return err.message;
  }
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}

function decisionErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "Ce colis n'attend plus de décision. Rescannez-le pour voir son état actuel.";
    return err.message;
  }
  if (isNetworkError(err)) return "Impossible de contacter le serveur DropLink.";
  return "Une erreur inattendue est survenue.";
}
