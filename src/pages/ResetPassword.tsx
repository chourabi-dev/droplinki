import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api";
import { authErrorMessage } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Deliberately distinct visual language from Login/Signup/ForgotPassword:
// a centered dark "security" card with a live password-strength meter and
// a redirect countdown on success, instead of a plain form.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const strength = useMemo(() => passwordStrength(password), [password]);
  const mismatch = confirm.length > 0 && password !== confirm;

  useEffect(() => {
    if (!done) return;
    if (countdown === 0) {
      navigate("/login");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch || password.length < 8) return;
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
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
          {done ? (
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
          ) : (
            <>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400">
                <KeyRound className="h-7 w-7" strokeWidth={2} />
              </div>
              <h1 className="font-display text-2xl font-bold text-white">Choisir un nouveau mot de passe</h1>
              <p className="mt-1.5 text-sm text-ink-300">
                Doit contenir au moins 8 caractères. Choisissez quelque chose que vous n'utilisez pas ailleurs.
              </p>

              {!token && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn-500/30 bg-warn-500/10 p-3 text-sm text-warn-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Lien de réinitialisation invalide ou incomplet. Redemandez un lien depuis la page de connexion.</p>
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

                <Button type="submit" fullWidth disabled={loading || mismatch || password.length < 8 || !token}>
                  {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
                </Button>
              </form>
            </>
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
