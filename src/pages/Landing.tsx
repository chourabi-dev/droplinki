import { Link } from "react-router-dom";
import {
  MapPin,
  Users,
  UploadCloud,
  BarChart3,
  Wallet,
  Warehouse,
  ArrowRight,
  Building2,
  Check,
  Truck,
  Store,
} from "lucide-react";
import { HowItWorks } from "@/components/HowItWorks";
import { PhoneMockup } from "@/components/PhoneMockup";
import { Button } from "@/components/ui/Button";
import { useCompanyAuth } from "@/context/CompanyAuthContext";

import logo from "@/assets/logo.png";
import cebs from "@/assets/cebs-dark.png";

const FEATURES = [
  {
    icon: MapPin,
    title: "Position exacte du client",
    text: "Le client partage sa position en un tap, ou vous la confirmez par téléphone. Fini les appels pour trouver une adresse.",
  },
  {
    icon: Users,
    title: "Livreurs et expéditeurs",
    text: "Créez les comptes de vos livreurs et de vos expéditeurs, assignez les livraisons et suivez la charge de chacun.",
  },
  {
    icon: UploadCloud,
    title: "Import en masse",
    text: "Importez des centaines de commandes d'un coup avec un fichier CSV : nom, téléphone, référence, montant, adresse.",
  },
  {
    icon: Warehouse,
    title: "Dépôt, chargement et retours",
    text: "Des stations de scan pour l'entrepôt : réception, chargement des tournées et contrôle des retours.",
  },
  {
    icon: Wallet,
    title: "Paiements et règlements",
    text: "Suivez les montants à reverser à vos expéditeurs et les règlements de vos livreurs, sans tableur.",
  },
  {
    icon: BarChart3,
    title: "Statistiques en temps réel",
    text: "Volume, taux de réussite, performance par livreur : tout votre pilotage sur un seul écran.",
  },
];

interface Plan {
  name: string;
  price: string;
  unit?: string;
  text: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

// NOTE: placeholder prices & limits — adjust to the real commercial offer.
const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "0 DT",
    unit: "/ mois",
    text: "Pour tester DropLink avec une petite équipe, sans engagement.",
    features: [
      "50 livraisons / mois",
      "2 livreurs",
      "1 compte expéditeur",
      "Lien de suivi client",
    ],
    cta: "Commencer gratuitement",
  },
  {
    name: "Business",
    price: "99 DT",
    unit: "/ mois",
    text: "Pour les entreprises de livraison qui gèrent une flotte au quotidien.",
    features: [
      "Livraisons illimitées",
      "Livreurs et expéditeurs illimités",
      "Import CSV",
      "Zones de livraison",
      "Paiements, retours et règlements",
      "Statistiques détaillées",
    ],
    cta: "Choisir Business",
    highlighted: true,
  },
  {
    name: "Entreprise",
    price: "Sur devis",
    text: "Pour les grands volumes, plusieurs dépôts et des besoins spécifiques.",
    features: [
      "Tout Business",
      "Stations de scan multi-dépôts",
      "Accompagnement à la mise en place",
      "Support prioritaire",
    ],
    cta: "Nous contacter",
  },
];

export default function Landing() {
  const { isAuthenticated } = useCompanyAuth();
  const ctaTo = isAuthenticated ? "/company/dashboard" : "/company/signup";
  const ctaLabel = isAuthenticated ? "Tableau de bord" : "Créer un compte entreprise";

  return (
    <div className="bg-white">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} width={150} alt="DropLink" />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-700 md:flex">
            <a href="#how" className="hover:text-ink-900">Comment ça marche</a>
            <a href="#features" className="hover:text-ink-900">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-ink-900">Tarifs</a>
          </nav>
          <Link to={ctaTo}>
            <Button size="sm">{isAuthenticated ? "Tableau de bord" : "Créer un compte"}</Button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-xs font-medium text-ink-700">
              <Building2 className="h-3.5 w-3.5 text-brand-600" />
              La plateforme SaaS des entreprises de livraison
            </div>
            <h1 className="font-display text-[2.5rem] font-bold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl">
              Pilotez toute votre flotte de livraison depuis un seul endroit.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-500">
              Créez vos livraisons, assignez-les à vos livreurs et laissez vos clients partager leur
              position exacte. Vous suivez tout en temps réel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={ctaTo}>
                <Button size="lg" fullWidth className="sm:w-auto">
                  {ctaLabel} <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline" fullWidth className="sm:w-auto">
                  Voir les tarifs
                </Button>
              </a>
            </div>
            {!isAuthenticated && (
              <p className="mt-4 text-sm text-ink-500">
                Vous avez déjà un compte entreprise ?{" "}
                <Link to="/company/login" className="font-semibold text-brand-600 hover:text-brand-700">
                  Se connecter
                </Link>
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Aucune app pour le client</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Position GPS précise</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-go-500" /> Offre gratuite pour démarrer</span>
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
              De la commande à la porte du client
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
              Conçu pour les équipes de livraison
            </h2>
            <p className="mt-3 text-ink-500">
              Tout ce dont votre entreprise a besoin pour livrer plus vite, sans perdre le fil.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </div>
                <p className="font-display font-semibold text-ink-900">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING 
      <section id="pricing" className="border-t border-ink-100 bg-ink-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">Des tarifs simples</h2>
            <p className="mt-3 text-ink-500">
              Commencez gratuitement, puis passez au niveau supérieur quand votre activité grandit.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => {
              const isContact = plan.name === "Entreprise";
              const to = isContact ? "/company/signup" : ctaTo;
              return (
                <div
                  key={plan.name}
                  className={
                    plan.highlighted
                      ? "relative flex flex-col rounded-2xl border-2 border-brand-600 bg-white p-7 shadow-lift"
                      : "flex flex-col rounded-2xl border border-ink-200 bg-white p-7"
                  }
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 right-7 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      Populaire
                    </span>
                  )}
                  <p className="font-display text-lg font-semibold text-ink-900">{plan.name}</p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-ink-950">{plan.price}</span>
                    {plan.unit && <span className="text-sm text-ink-500">{plan.unit}</span>}
                  </p>
                  <p className="mt-4 text-sm text-ink-500">{plan.text}</p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-700">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-go-500" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <Link to={to} className="mt-7 block">
                    <Button variant={plan.highlighted ? "primary" : "outline"} fullWidth>
                      {isAuthenticated ? "Tableau de bord" : plan.cta}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      */}

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">
            Prêt à organiser vos livraisons ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-500">
            Créez le compte de votre entreprise et lancez votre première livraison en quelques minutes.
          </p>
          <Link to={ctaTo} className="mt-7 inline-block">
            <Button size="lg">
              {ctaLabel} <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-100 bg-ink-50/60 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Logins for drivers and expéditeurs */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            <Link
              to="/login"
              className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-ink-900">Connexion livreur</p>
                <p className="text-sm text-ink-500">Accédez à vos livraisons et à votre tournée.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-400" />
            </Link>
            <Link
              to="/client/login"
              className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Store className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-ink-900">Connexion expéditeur</p>
                <p className="text-sm text-ink-500">Suivez vos envois et vos paiements.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-400" />
            </Link>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-8 text-sm text-ink-500 sm:flex-row">
            <img src={logo} width={160} alt="DropLink" />
            <nav className="flex items-center gap-5 text-xs font-medium text-ink-500">
              <Link to="/privacy-policy" className="hover:text-ink-900">Politique de confidentialité</Link>
              <Link to="/terms-of-use" className="hover:text-ink-900">Conditions d'utilisation</Link>
            </nav>
            <div className="text-center text-xs text-ink-400">
              <p>All rights reserved | PoweredBy</p>
              <a
                href="https://www.chourabi-e-business-solutions.com/"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block"
              >
                <img src={cebs} width={100} alt="Chourabi E-Business Solutions" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
