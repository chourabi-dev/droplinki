import { PackagePlus, Send, LocateFixed, Navigation } from "lucide-react";

const STEPS = [
  {
    icon: PackagePlus,
    title: "Créer la livraison",
    text: "Le livreur entre le nom du client. DropLink génère un lien unique en une seconde.",
  },
  {
    icon: Send,
    title: "Envoyer le lien",
    text: "Le lien part directement sur WhatsApp, avec un message déjà rédigé.",
  },
  {
    icon: LocateFixed,
    title: "Le client partage sa position",
    text: "Un seul bouton à presser. Aucun compte, aucune application à installer.",
  },
  {
    icon: Navigation,
    title: "Le livreur navigue",
    text: "La position exacte s'affiche sur la carte. Direction Google Maps en un tap.",
  },
];

export function HowItWorks() {
  return (
    <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent lg:block" />
      {STEPS.map((step, i) => (
        <div key={step.title} className="relative flex flex-col items-start">
          <div className="relative z-10 mb-4 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card ring-1 ring-ink-100">
            <step.icon className="h-6 w-6" strokeWidth={2} />
          </div>
          <p className="mb-1.5 flex items-baseline gap-2 font-display text-base font-semibold text-ink-900">
            <span className="text-brand-400">{i + 1}</span> {step.title}
          </p>
          <p className="text-sm leading-relaxed text-ink-500">{step.text}</p>
        </div>
      ))}
    </div>
  );
}
