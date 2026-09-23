import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCompanyAuth, companyAuthErrorMessage } from "@/context/CompanyAuthContext";
import { useToast } from "@/context/ToastContext";
import logo from "@/assets/logo.png";

const PERKS = [
  "Créez des livraisons en un clic ou en masse (CSV)",
  "Ajoutez toute votre équipe de livreurs",
  "Appelez vos clients pour confirmer leur position",
  "Suivez vos statistiques de livraison en temps réel",
];

export default function CompanySignup() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, isLoading: authLoading } = useCompanyAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", taxId: "", headOfficeAddress: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

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

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(form);
      showToast("Compte entreprise créé avec succès", "success");
      navigate("/company/dashboard");
    } catch (err) {
      setError(companyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(91,95,239,0.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(67,56,234,0.3),transparent_45%)]" />
        <Link to="/company" className="relative z-10 flex items-center gap-2">
          <img src={logo} width={190} className="brightness-0 invert" />
        </Link>

        <div className="relative z-10">
          <span className="mb-4 inline-block rounded-full bg-brand-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-300">
            Espace entreprise
          </span>
          <h2 className="font-display text-3xl font-bold text-white">Pilotez toute votre flotte de livraison.</h2>
          <p className="mt-3 max-w-sm text-sm text-ink-300">
            Un tableau de bord dédié pour créer vos livraisons, gérer vos livreurs et suivre chaque client jusqu'à sa
            porte.
          </p>
          <ul className="mt-7 space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm text-ink-200">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-go-500/20 text-go-500">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-white">
                  {perk}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center bg-ink-50 px-4 py-12 lg:bg-white">
        <div className="w-full max-w-sm">
          <Link to="/company" className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Building2 className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold text-ink-900">DropLink Entreprise</span>
          </Link>

          <h1 className="font-display text-2xl font-bold text-ink-950">Créer votre compte entreprise</h1>
          <p className="mt-1.5 text-sm text-ink-500">Gratuit pour démarrer — passez à l'échelle quand vous en avez besoin.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Nom de l'entreprise"
              placeholder="Ex. Express Livraison SARL"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
            <Input
              label="Téléphone"
              type="tel"
              placeholder="+216 20 123 456"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
            <Input
              label="Matricule fiscale"
              placeholder="Ex. 1234567A/A/M/000"
              value={form.taxId}
              onChange={(e) => update("taxId", e.target.value)}
              hint="Numéro d'identification fiscale de l'entreprise."
              required
            />
            <Input
              label="Siège social"
              placeholder="Ex. 15 Avenue Habib Bourguiba, Tunis"
              value={form.headOfficeAddress}
              onChange={(e) => update("headOfficeAddress", e.target.value)}
              hint="Adresse officielle du siège social."
              required
            />
            <Input
              label="Email professionnel"
              type="email"
              placeholder="contact@votreentreprise.com"
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

            <label className="flex items-start gap-2.5 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              J'accepte les{" "}
              <Link to="/terms-of-use" className="font-semibold text-brand-600 hover:text-brand-700">
                conditions d'utilisation
              </Link>{" "}
              et la{" "}
              <Link to="/privacy-policy" className="font-semibold text-brand-600 hover:text-brand-700">
                politique de confidentialité
              </Link>
              .
            </label>

            <Button type="submit" fullWidth disabled={loading || !agreed}>
              {loading ? "Création..." : "Créer le compte"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Déjà un compte ?{" "}
            <Link to="/company/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Se connecter
            </Link>
          </p>
           
        </div>
      </div>
    </div>
  );
}
