import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

export default function PrivacyPolicy() {
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
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-ink-500">Dernière mise à jour : 22 septembre 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-700">
          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">1. Introduction</h2>
            <p className="mt-2">
              Cette Politique de confidentialité explique quelles données DropLink (« nous »)
              collecte, comment elles sont utilisées, et quels sont vos droits en tant que livreur
              ou client utilisant le Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">2. Données que nous collectons</h2>
            <p className="mt-2">Selon votre usage du Service, nous pouvons collecter :</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><span className="font-medium text-ink-900">Compte livreur :</span> nom, numéro de téléphone, adresse email et mot de passe (ou identifiant Google si vous vous connectez via Google).</li>
              <li><span className="font-medium text-ink-900">Livraisons :</span> informations saisies par le livreur pour créer une livraison (ex. référence, destinataire).</li>
              <li><span className="font-medium text-ink-900">Position du client :</span> coordonnées GPS partagées volontairement par le client via le lien de livraison, uniquement au moment où il choisit de les partager.</li>
              <li><span className="font-medium text-ink-900">Données techniques :</span> adresse IP, type d'appareil et journaux de connexion, à des fins de sécurité et de bon fonctionnement du Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">3. Comment nous utilisons ces données</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Créer et gérer votre compte livreur ;</li>
              <li>Permettre le suivi et la navigation vers l'adresse du client pour une livraison donnée ;</li>
              <li>Afficher l'historique de vos livraisons ;</li>
              <li>Assurer la sécurité, prévenir la fraude et résoudre les problèmes techniques ;</li>
              <li>Vous contacter au sujet du Service, le cas échéant.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">4. Partage des données</h2>
            <p className="mt-2">
              Nous ne vendons pas vos données personnelles. La position d'un client n'est visible
              que par le livreur associé à la livraison concernée. Nous pouvons partager des
              données avec des prestataires techniques (ex. hébergement, cartographie) uniquement
              dans la mesure nécessaire au fonctionnement du Service, ou si la loi l'exige.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">5. Conservation des données</h2>
            <p className="mt-2">
              Les données de compte sont conservées tant que votre compte est actif. Les données de
              position d'un client sont conservées uniquement le temps nécessaire au traitement de
              la livraison concernée, puis supprimées ou archivées de façon limitée dans
              l'historique des livraisons du livreur.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">6. Sécurité</h2>
            <p className="mt-2">
              Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour
              protéger vos données contre l'accès non autorisé, la perte ou l'altération. Aucun
              système n'étant totalement infaillible, nous ne pouvons garantir une sécurité
              absolue.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">7. Vos droits</h2>
            <p className="mt-2">
              Vous pouvez demander l'accès, la correction ou la suppression de vos données
              personnelles, ainsi que la désactivation de votre compte, à tout moment en nous
              contactant via les coordonnées ci-dessous.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">8. Cookies</h2>
            <p className="mt-2">
              Le Service peut utiliser des cookies ou technologies similaires strictement
              nécessaires à son fonctionnement, par exemple pour maintenir votre session connectée.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">9. Modifications de cette politique</h2>
            <p className="mt-2">
              Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. La
              date de dernière mise à jour figure en haut de cette page. Pour connaître les règles
              d'usage du Service, consultez également nos{" "}
              <Link to="/terms-of-use" className="font-semibold text-brand-600 hover:text-brand-700">
                Conditions d'utilisation
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-ink-950">10. Contact</h2>
            <p className="mt-2">
              Pour toute question relative à cette Politique de confidentialité, contactez-nous via
              le site de{" "}
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
