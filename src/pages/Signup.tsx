import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      signup({ name: form.name || "Nouveau livreur", phone: form.phone, email: form.email });
      showToast("Compte créé avec succès", "success");
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
          <h1 className="font-display text-2xl font-bold text-ink-950">Créer votre compte</h1>
          <p className="mt-1.5 text-sm text-ink-500">Gratuit, 5 livraisons par mois incluses.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Nom complet"
              placeholder="Karim Bouazizi"
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
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="8 caractères minimum"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Création..." : "Créer mon compte"} {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
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
