import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth, authErrorMessage } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GOOGLE_CLIENT_ID, renderGoogleButton } from "@/lib/googleAuth";
import logo from "@/assets/logo.png";

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleBtnRef.current) return;
    renderGoogleButton(googleBtnRef.current, async (credential) => {
      try {
        await loginWithGoogle(credential);
        showToast("Compte créé avec succès", "success");
        navigate("/dashboard");
      } catch (err) {
        setError(authErrorMessage(err));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour continuer.");
      return;
    }
    setLoading(true);
    try {
      await signup(form);
      showToast("Compte créé avec succès", "success");
      navigate("/dashboard");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} width={200} />
        </Link>

        <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-950">Créer votre compte</h1>
          <p className="mt-1.5 text-sm text-ink-500">Gratuit, 5 livraisons par mois incluses.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Nom complet"
              placeholder="Nom livreur"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
              required
            />
            <Input
              label="Téléphone"
              type="tel"
              placeholder="20 123 456"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="8 caractères minimum"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="accept-terms" className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-600">
              <input
                id="accept-terms"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-2 focus:ring-brand-500/30"
              />
              <span>
                J'ai lu et j'accepte les{" "}
                <Link to="/terms-of-use" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
                  Conditions d'utilisation
                </Link>{" "}
                et la{" "}
                <Link to="/privacy-policy" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
                  Politique de confidentialité
                </Link>
                .
              </span>
            </label>

            <Button type="submit" fullWidth disabled={loading || !agreed}>
              {loading ? "Création..." : "Créer mon compte"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-medium text-ink-500">ou</span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>
              <div className="relative flex justify-center">
                <div ref={googleBtnRef} />
                {!agreed && (
                  <button
                    type="button"
                    aria-label="Acceptez les conditions d'utilisation et la politique de confidentialité pour continuer"
                    onClick={() =>
                      setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour continuer.")
                    }
                    className="absolute inset-0 cursor-not-allowed rounded-xl bg-white/70"
                  />
                )}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Déjà inscrit ?{" "}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
