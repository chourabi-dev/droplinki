import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { MapPin, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth, authErrorMessage } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GOOGLE_CLIENT_ID, renderGoogleButton } from "@/lib/googleAuth";

import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";


export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleBtnRef.current) return;
    renderGoogleButton(googleBtnRef.current, async (credential) => {
      try {
        await loginWithGoogle(credential);
        showToast("Connexion réussie", "success");
        navigate("/dashboard");
      } catch (err) {
        setError(authErrorMessage(err));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already signed in (e.g. valid session restored from localStorage) — skip the form.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      showToast("Connexion réussie", "success");
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
          <h1 className="font-display text-2xl font-bold text-ink-950">Content de vous revoir</h1>
          <p className="mt-1.5 text-sm text-ink-500">Connectez-vous pour gérer vos livraisons.</p>

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
              autoComplete="email"
              required
            />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-ink-700">
                  Mot de passe
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-100" />
                <span className="text-xs font-medium text-ink-500">ou</span>
                <span className="h-px flex-1 bg-ink-100" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
