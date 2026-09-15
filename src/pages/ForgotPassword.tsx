import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ShieldQuestion, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api";
import { authErrorMessage } from "@/context/AuthContext";

// Deliberately distinct visual language from Login/Signup: a split hero panel
// instead of a single centered card, with a step indicator instead of a form-only page.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // The backend just emailed a 6-digit code — send the user straight to
      // the verification screen, carrying the email along in the query string.
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(91,95,239,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(67,56,234,0.3),transparent_45%)]" />
        <Link to="/" className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapPin className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-white">DropLink</span>
        </Link>

        <div className="relative z-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
            <ShieldQuestion className="h-8 w-8" strokeWidth={2} />
          </div>
          <h2 className="font-display text-3xl font-bold text-white">Ça arrive à tout le monde.</h2>
          <p className="mt-3 max-w-sm text-sm text-ink-300">
            Indiquez votre email et nous vous enverrons un code à 6 chiffres pour choisir un nouveau mot de passe en
            quelques secondes.
          </p>

          <Stepper current={1} />
        </div>

        <p className="relative z-10 text-xs text-ink-500">DropLink — livraisons simplifiées</p>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <MapPin className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold text-ink-900">DropLink</span>
          </Link>

          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la connexion
          </Link>

          <h1 className="font-display text-2xl font-bold text-ink-950">Mot de passe oublié</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Saisissez l'adresse email associée à votre compte DropLink, nous vous enverrons un code de
            vérification à 6 chiffres.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Envoi..." : "Envoyer le code"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Demander un code", "Vérifier le code", "Choisir un mot de passe"];
  return (
    <ol className="relative z-10 mt-8 space-y-4">
      {steps.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const active = step === current;
        const done = step < current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-go-500 text-white"
                  : active
                  ? "bg-brand-500 text-white"
                  : "bg-white/10 text-ink-400"
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
            </span>
            <span className={`text-sm ${active || done ? "text-white" : "text-ink-500"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}