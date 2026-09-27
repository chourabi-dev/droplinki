import { Link } from "react-router-dom";
import { ArrowRight, Users, Package, PhoneCall, UploadCloud, BarChart3, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCompanyAuth } from "@/context/CompanyAuthContext";
import logo from "@/assets/logo.png";

const FEATURES = [
  {
    icon: Package,
    title: "Créez des livraisons en masse",
    text: "Ajoutez une livraison en quelques secondes, ou importez des centaines de commandes d'un coup via un fichier CSV.",
  },
  {
    icon: Users,
    title: "Gérez toute votre équipe",
    text: "Ajoutez vos livreurs, assignez-leur des livraisons et suivez leur charge de travail en un coup d'œil.",
  },
  {
    icon: PhoneCall,
    title: "Appelez vos clients",
    text: "Confirmez la position d'un client par téléphone et épinglez-la directement sur la carte, sans attendre qu'il partage son lien.",
  },
  {
    icon: BarChart3,
    title: "Statistiques en temps réel",
    text: "Volume de livraisons, taux de réussite, performance par livreur : tout votre pilotage en un seul écran.",
  },
];

export default function CompanyLanding() {
  const { isAuthenticated } = useCompanyAuth();
  const ctaTo = isAuthenticated ? "/company/dashboard" : "/company/signup";
  const ctaLabel = isAuthenticated ? "Tableau de bord" : "Créer un compte entreprise";

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/company" className="flex items-center gap-2">
            <img src={logo} width={140} />
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
              Entreprise
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden text-sm font-semibold text-ink-500 hover:text-ink-900 md:block">
              Espace livreur
            </Link>
            {isAuthenticated ? (
              <Link to="/company/dashboard">
                <Button size="sm">Tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link to="/company/login" className="hidden text-sm font-semibold text-ink-700 hover:text-ink-900 sm:block">
                  Connexion
                </Link>
                <Link to="/company/signup">
                  <Button size="sm">Commencer</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-ink-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(91,95,239,0.35),transparent_45%),radial-gradient(circle_at_85%_60%,rgba(67,56,234,0.3),transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-ink-200">
            <Building2 className="h-3.5 w-3.5 text-brand-300" />
            Pour les entreprises et flottes de livraison
          </div>
          <h1 className="max-w-3xl font-display text-[2.25rem] font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Le tableau de bord qui pilote toute votre flotte de livraison.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-300">
            Créez vos livraisons, assignez-les à vos livreurs, confirmez la position de vos clients par téléphone ou
            par lien, et suivez tout depuis un seul endroit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to={ctaTo}>
              <Button size="lg" fullWidth className="sm:w-auto">
                {ctaLabel} <ArrowRight className="h-4.5 w-4.5" />
              </Button>
            </Link>
            <Link to="/company/login">
              <Button size="lg" variant="outline" fullWidth className="sm:w-auto border-white/20 bg-transparent text-white hover:bg-white/10">
                J'ai déjà un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-2xl font-bold text-ink-950 sm:text-3xl">Conçu pour les équipes, pas seulement les solos.</h2>
        <p className="mt-2 max-w-xl text-ink-500">
          Tout ce dont votre entreprise a besoin pour livrer plus vite, sans perdre le fil.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CSV callout */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-ink-950 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
              <UploadCloud className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold text-white">Déjà des centaines de commandes ?</h3>
            <p className="mt-1.5 max-w-md text-sm text-ink-300">
              Importez-les toutes d'un coup avec un simple fichier CSV — nom, téléphone, référence, montant, adresse.
            </p>
          </div>
          <Link to="/company/signup">
            <Button size="lg">
              Essayer l'import CSV <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 px-4 py-8 text-center text-xs text-ink-400 sm:px-6">
        <p className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-go-500" /> Compatible avec le suivi client DropLink existant — vos clients gardent le même lien de suivi.
        </p>
      </footer>
    </div>
  );
}
