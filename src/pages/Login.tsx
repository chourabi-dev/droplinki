import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("karim@droplink.app");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      login(email, password);
      showToast("Connexion réussie", "success");
      navigate("/dashboard");
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <MapPin className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-bold text-ink-900">DropLink</span>
        </Link>

        <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-950">Content de vous revoir</h1>
          <p className="mt-1.5 text-sm text-ink-500">Connectez-vous pour gérer vos livraisons.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
          <p className="mt-2 text-center text-xs text-ink-500">
            Prototype — n'importe quel email/mot de passe fonctionne.
          </p>
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
