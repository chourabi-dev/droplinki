import { Link } from "react-router-dom";
import {
  MapPin,
  Zap,
  Map as MapIcon,
  Package,
  ArrowRight,
  Phone,
  Check,
} from "lucide-react";
import { HowItWorks } from "@/components/HowItWorks";
import { PhoneMockup } from "@/components/PhoneMockup";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  {
    icon: MapPin,
    title: "Position exacte",
    text: "Fini les suppositions. Le point GPS du client s'affiche directement sur votre carte.",
  },
  {
    icon: Zap,
    title: "Partage en un tap",
    text: "Le client n'a besoin ni de compte, ni d'application. Un bouton, et c'est fait.",
  },
  {
    icon: MapIcon,
    title: "Ouverture dans Maps",
    text: "Un tap suffit pour lancer la navigation vers le client depuis Google Maps.",
  },
  {
    icon: Package,
    title: "Historique des livraisons",
    text: "Retrouvez chaque livraison, son statut et sa position, à tout moment.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const ctaTo = isAuthenticated ? "/dashboard" : "/signup";
  const ctaLabel = isAuthenticated ? "Tableau de bord" : "Commencer gratuitement";
  return (
    <div className="bg-white">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <MapPin className="h-4.5 w-4.5" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">DropLink</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-700 md:flex">
            <a href="#how" className="hover:text-ink-900">Comment ça marche</a>
            <a href="#features" className="hover:text-ink-900">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-ink-900">Tarifs</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm">Tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-semibold text-ink-700 hover:text-ink-900 sm:block">
                  Connexion
                </Link>
                <Link to="/signup">
                  <Button size="sm">Commencer</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-xs font-medium text-ink-600">
              <Phone className="h-3.5 w-3.5 text-brand-600" />
              Conçu pour les livreurs indépendants et flottes locales
            </div>
            <h1 className="font-display text-[2.5rem] font-bold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl">
              Arrêtez d'appeler vos clients pour trouver leur adresse.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-500">
              Envoyez un lien. Votre client partage sa position exacte. Vous naviguez directement
              jusqu'à sa porte.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={ctaTo}>
                <Button size="lg" fullWidth className="sm:w-auto">
                  {ctaLabel} <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline" fullWidth className="sm:w-auto">
                  Voir comment ça marche
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Aucune app pour le client</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Position GPS précise</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Prêt en 10 secondes</span>
            </div>
          </div>
          <div className="lg:pl-6">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-ink-100 bg-ink-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">
              Créer, envoyer, retrouver. C'est tout.
            </h2>
            <p className="mt-3 text-ink-500">
              Quatre étapes séparent la création d'une livraison de l'arrivée chez le client.
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">
              Conçu pour les livreurs
            </h2>
            <p className="mt-3 text-ink-500">
              Chaque détail de DropLink existe pour vous faire gagner du temps sur le terrain.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink-900">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-ink-100 bg-ink-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">Des tarifs simples</h2>
            <p className="mt-3 text-ink-500">Commencez gratuitement. Passez au niveau supérieur quand vous en avez besoin.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 sm:max-w-2xl">
            <div className="rounded-2xl border border-ink-200 bg-white p-7">
              <p className="font-display text-lg font-semibold text-ink-900">Free</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-ink-950">0 DT</span>
                <span className="text-sm text-ink-500">/ mois</span>
              </p>
              <p className="mt-4 text-sm text-ink-500">5 livraisons par mois, pour tester DropLink sans engagement.</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> 5 livraisons / mois</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Partage de lien WhatsApp</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Carte en temps réel</li>
              </ul>
              <Link to={ctaTo} className="mt-7 block">
                <Button variant="outline" fullWidth>{isAuthenticated ? "Tableau de bord" : "Commencer"}</Button>
              </Link>
            </div>
            <div className="relative rounded-2xl border-2 border-brand-600 bg-white p-7 shadow-lift">
              <span className="absolute -top-3 right-7 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Populaire
              </span>
              <p className="font-display text-lg font-semibold text-ink-900">Pro</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-ink-950">29 DT</span>
                <span className="text-sm text-ink-500">/ mois</span>
              </p>
              <p className="mt-4 text-sm text-ink-500">Pour les livreurs actifs qui veulent le contrôle total.</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Livraisons illimitées</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Historique complet</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Statistiques détaillées</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-go-500" /> Support prioritaire</li>
              </ul>
              <Link to={isAuthenticated ? "/profile" : "/signup"} className="mt-7 block">
                <Button fullWidth>Passer en Pro</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">
            Votre prochaine livraison n'a pas besoin d'un appel téléphonique.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-500">Créez votre compte et envoyez votre premier lien en moins d'une minute.</p>
          <Link to={ctaTo} className="mt-7 inline-block">
            <Button size="lg">{isAuthenticated ? "Aller au tableau de bord" : "Créer mon compte"} <ArrowRight className="h-4.5 w-4.5" /></Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" />
            <span className="font-display font-semibold text-ink-900">DropLink</span>
          </div>
          <p>© 2026 DropLink.</p>
        </div>
      </footer>
    </div>
  );
}
