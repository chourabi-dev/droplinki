import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCompanyAuth, companyAuthErrorMessage } from "@/context/CompanyAuthContext";
import { useToast } from "@/context/ToastContext";
import logo from "@/assets/logo.png";

export default function CompanyLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useCompanyAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/company/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      showToast("Connexion réussie", "success");
      navigate("/company/dashboard");
    } catch (err) {
      setError(companyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/company" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} width={180} className="brightness-0 invert" />
          <span className="rounded-full bg-brand-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-300">
            Entreprise
          </span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-card sm:p-8">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-ink-950">Espace entreprise</h1>
          <p className="mt-1.5 text-sm text-ink-500">Connectez-vous pour gérer vos livreurs et vos livraisons.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email professionnel"
              type="email"
              placeholder="contact@votreentreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-300">
          Pas encore de compte entreprise ?{" "}
          <Link to="/company/signup" className="font-semibold text-brand-300 hover:text-brand-200">
            Créer un compte
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink-400">
          Vous êtes livreur indépendant ?{" "}
          <Link to="/login" className="font-semibold text-ink-200 hover:text-white">
            Connexion livreur
          </Link>
        </p>
      </div>
    </div>
  );
}
