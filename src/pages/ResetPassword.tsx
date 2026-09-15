import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, KeyRound, MailCheck, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { authApi } from "@/lib/api";
import { authErrorMessage } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

type Step = "code" | "password" | "done";

// Deliberately distinct visual language from Login/Signup/ForgotPassword:
// a centered dark "security" card. Two steps live on this one screen — enter
// the 6-digit code emailed by /forgot-password, then pick a new password —
// followed by a redirect countdown on success, instead of a plain form.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";

  const [step, setStep] = useState<Step>("code");

  // Step 1: code verification
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Step 2: new password
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3: success
  const [countdown, setCountdown] = useState(5);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    if (step !== "done") return;
    if (countdown === 0) {
      navigate("/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown, navigate]);

  useEffect(() => {
    if (resendCooldown === 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < CODE_LENGTH) return;
    setCodeError(null);
    setCodeLoading(true);
    try {
      await authApi.verifyResetCode({ email, code });
      setStep("password");
    } catch (err) {
      setCodeError(authErrorMessage(err));
    } finally {
      setCodeLoading(false);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setCodeError(null);
    setResendLoading(true);
    try {
      await authApi.forgotPassword(email);
      setCode("");
      setResendMessage("Un nouveau code vient d'être envoyé.");
      setResendCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setCodeError(authErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || password.length < 8) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, password });
      setStep("done");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapPin className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-white">DropLink</span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-ink-900 p-7 shadow-2xl sm:p-8">
          {!email ? (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warn-500/15 text-warn-500">
                <AlertCircle className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Lien invalide</h1>
              <p className="mt-2 text-sm text-ink-300">
                Il manque l'adresse email associée à cette demande. Redemandez un code depuis la page de
                connexion.
              </p>
              <Link to="/forgot-password" className="mt-6 block">
                <Button fullWidth>Demander un code</Button>
              </Link>
            </div>
          ) : step === "code" ? (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
                <MailCheck className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Entrez le code reçu</h1>
              <p className="mt-1.5 text-sm text-ink-300">
                Nous avons envoyé un code à 6 chiffres à{" "}
                <span className="font-semibold text-white">{email}</span>. Il expire au bout de quelques minutes.
              </p>

              {codeError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{codeError}</p>
                </div>
              )}
              {resendMessage && !codeError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-go-500/30 bg-go-500/10 p-3 text-sm text-go-500">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{resendMessage}</p>
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="mt-6 space-y-5">
                <OtpInput
                  value={code}
                  onChange={setCode}
                  length={CODE_LENGTH}
                  disabled={codeLoading}
                  error={!!codeError}
                  autoFocus
                />

                <Button type="submit" fullWidth disabled={codeLoading || code.length < CODE_LENGTH}>
                  {codeLoading ? "Vérification..." : "Vérifier le code"}
                </Button>
              </form>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="mt-4 w-full text-center text-sm font-medium text-brand-400 hover:text-brand-300 disabled:cursor-not-allowed disabled:text-ink-500"
              >
                {resendCooldown > 0
                  ? `Renvoyer le code (${resendCooldown}s)`
                  : resendLoading
                  ? "Envoi..."
                  : "Vous n'avez rien reçu ? Renvoyer le code"}
              </button>
            </>
          ) : step === "password" ? (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
                <KeyRound className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Choisir un nouveau mot de passe</h1>
              <p className="mt-1.5 text-sm text-ink-300">
                Doit contenir au moins 8 caractères. Choisissez quelque chose que vous n'utilisez pas ailleurs.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div className="relative">
                  <Input
                    label="Nouveau mot de passe"
                    type={showPassword ? "text" : "password"}
                    placeholder="8 caractères minimum"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-ink-950 text-white placeholder:text-ink-500 pr-11"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-[38px] text-ink-400 hover:text-white"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {password.length > 0 && <StrengthMeter strength={strength} />}

                <Input
                  label="Confirmer le mot de passe"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ressaisissez le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border-white/10 bg-ink-950 text-white placeholder:text-ink-500"
                  required
                />
                {mismatch && <p className="-mt-2 text-xs text-red-400">Les mots de passe ne correspondent pas.</p>}

                <Button type="submit" fullWidth disabled={loading || mismatch || password.length < 8}>
                  {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setStep("code")}
                className="mt-4 w-full text-center text-sm font-medium text-ink-400 hover:text-white"
              >
                Revenir à la saisie du code
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-go-500/15 text-go-500 animate-check-pop">
                <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Mot de passe mis à jour</h1>
              <p className="mt-2 text-sm text-ink-300">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
              <p className="mt-4 text-xs text-ink-500">Redirection vers la connexion dans {countdown}s...</p>
              <Link to="/login" className="mt-6 block">
                <Button fullWidth>
                  Aller à la connexion <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-400">
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

type Strength = 0 | 1 | 2 | 3;

function passwordStrength(password: string): Strength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score >= 4) return 3;
  if (score === 3) return 2;
  if (score >= 1) return 1;
  return 0;
}

const STRENGTH_LABELS: Record<Strength, string> = {
  0: "Trop court",
  1: "Faible",
  2: "Moyen",
  3: "Fort",
};

const STRENGTH_COLORS: Record<Strength, string> = {
  0: "bg-red-500",
  1: "bg-warn-500",
  2: "bg-brand-500",
  3: "bg-go-500",
};

function StrengthMeter({ strength }: { strength: Strength }) {
  return (
    <div className="-mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full bg-white/10", i < strength && STRENGTH_COLORS[strength])}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-400">{STRENGTH_LABELS[strength]}</p>
    </div>
  );
}