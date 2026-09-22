import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} width={150} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-ink-950 sm:text-4xl">
          Conditions d'utilisation
        </h1>
        <p className="mt-2 text-sm text-ink-500">Dernière mise à jour : 22 septembre 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-700">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">1. Acceptation des conditions</h2>
            <p className="mt-2">
              En créant un compte ou en utilisant DropLink (le « Service »), vous acceptez d'être
              lié par les présentes Conditions d'utilisation. Si vous n'acceptez pas ces
              conditions, veuillez ne pas utiliser le Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">2. Description du service</h2>
            <p className="mt-2">
              DropLink permet à un livreur de créer une livraison, d'envoyer un lien unique à un
              client, et de recevoir la position GPS de ce client afin de faciliter la navigation
              jusqu'à son adresse. Le client n'a besoin ni de compte ni d'application pour partager
              sa position.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">3. Compte utilisateur</h2>
            <p className="mt-2">
              Vous êtes responsable de la confidentialité de vos identifiants de connexion et de
              toute activité effectuée depuis votre compte. Vous vous engagez à fournir des
              informations exactes lors de votre inscription et à les maintenir à jour.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">4. Utilisation acceptable</h2>
            <p className="mt-2">Vous vous engagez à ne pas utiliser DropLink pour :</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Collecter la position d'un client sans son consentement explicite ;</li>
              <li>Envoyer des liens à des fins frauduleuses, trompeuses ou malveillantes ;</li>
              <li>Perturber, surcharger ou compromettre la sécurité du Service ;</li>
              <li>Utiliser le Service en violation de toute loi ou réglementation applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">5. Données de localisation</h2>
            <p className="mt-2">
              Le partage de position par le client est volontaire et ponctuel. Les données de
              localisation sont utilisées uniquement dans le cadre de la livraison concernée. Pour
              plus de détails, consultez notre{" "}
              <Link to="/privacy-policy" className="font-semibold text-brand-600 hover:text-brand-700">
                Politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">6. Disponibilité du service</h2>
            <p className="mt-2">
              Nous nous efforçons de maintenir DropLink accessible et fonctionnel, mais nous ne
              garantissons pas une disponibilité ininterrompue. Le Service peut être suspendu
              temporairement pour maintenance ou mise à jour.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">7. Limitation de responsabilité</h2>
            <p className="mt-2">
              DropLink est fourni « tel quel ». Dans la mesure permise par la loi, nous déclinons
              toute responsabilité pour les dommages indirects résultant de l'utilisation ou de
              l'impossibilité d'utiliser le Service, y compris les erreurs de localisation ou de
              navigation fournies par des services tiers (ex. Google Maps).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">8. Résiliation</h2>
            <p className="mt-2">
              Vous pouvez cesser d'utiliser le Service à tout moment. Nous nous réservons le droit
              de suspendre ou de résilier un compte en cas de violation des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">9. Modifications</h2>
            <p className="mt-2">
              Nous pouvons mettre à jour ces Conditions d'utilisation périodiquement. Toute
              modification importante vous sera communiquée. La poursuite de l'utilisation du
              Service après une mise à jour vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">10. Contact</h2>
            <p className="mt-2">
              Pour toute question relative à ces Conditions d'utilisation, contactez-nous via le
              site de{" "}
              <a
                href="https://www.chourabi-e-business-solutions.com/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Chourabi E-Business Solutions
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
