# DropLink

Prototype d'une plateforme de partage de position pensée pour les livreurs.
**"Pas d'appel. Pas d'itinéraire à décrire. Juste un lien."**

Le livreur crée une livraison → envoie un lien unique par WhatsApp → le client
ouvre le lien (sans compte, sans application) → il appuie sur un bouton pour
partager sa position → le livreur voit la position exacte sur une carte et
ouvre Google Maps en un tap.

Ce dépôt est un prototype frontend. Il n'y a pas de vrai backend : toutes les
données (livraisons, profil, session) sont simulées et persistées dans le
`localStorage` du navigateur.

---

## Stack technique

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Leaflet / Leaflet (OpenStreetMap) pour les cartes
- lucide-react pour les icônes

## Installation et lancement

Prérequis : Node.js 18+ et npm.

```bash
npm install
npm run dev
```

Ouvrez ensuite l'URL affichée dans le terminal (par défaut
`http://localhost:5173`).

Pour un build de production :

```bash
npm run build
npm run preview
```

> La carte utilise les tuiles publiques d'OpenStreetMap et les polices
> Google Fonts : une connexion internet est nécessaire pour les voir
> s'afficher correctement. Sans connexion, l'application reste pleinement
> fonctionnelle (carte avec fond uni, police système).

---

## Comment démontrer le flux complet

L'application inclut un **mode démo** visible en haut du tableau de bord.

1. **Connexion** : sur `/login`, n'importe quel email/mot de passe fonctionne
   (authentification simulée). Un jeu de données de démonstration (3
   livraisons, coordonnées à Tunis) est préchargé automatiquement.
2. **Créer une livraison** : cliquez sur "+ Nouvelle livraison", remplissez le
   nom du client, validez. Un lien unique est généré instantanément
   (`/d/DL-xxxx`).
3. **Envoyer le lien** : copiez le lien ou ouvrez-le dans WhatsApp (bouton
   dédié, message pré-rédigé).
4. **Simuler le client** :
   - **Option A — deux onglets** : copiez le lien affiché et ouvrez-le dans un
     nouvel onglet. Cliquez sur "Partager ma position" : le navigateur
     demandera l'autorisation GPS. Une fois autorisée (ou si elle est
     refusée/indisponible), un bouton "Simuler ma position" permet de
     continuer la démo sans GPS réel.
   - **Option B — plus rapide** : depuis la page de détail de la livraison
     côté livreur (`/deliveries/DL-xxxx`), tant qu'aucune position n'a été
     reçue, un bouton "Simuler la réception de la position (démo)" est
     disponible directement.
5. **Le livreur navigue** : dès que la position est reçue, la carte affiche le
   livreur et le client, avec la distance, le temps estimé et le bouton
   "Ouvrir dans Google Maps".
6. **Marquer comme livrée** : un bouton avec confirmation clôt la livraison.

Les données changent en direct entre onglets ouverts sur la même session
(synchronisation via `localStorage`/`storage` event), ce qui permet de garder
le tableau de bord du livreur ouvert dans un onglet pendant que vous simulez
le client dans un autre.

Le bouton "Réinitialiser" dans le bandeau de mode démo restaure le jeu de
données d'exemple à tout moment.

---

## Structure du projet

```
src/
  components/       Composants UI réutilisables (carte, cartes de livraison,
                     en-tête, barre de navigation mobile, mockup du hero...)
  components/ui/     Primitives (Button, Card, Input, Textarea)
  context/           État applicatif simulé (Auth, Deliveries, Toasts)
  lib/               Fonctions utilitaires (distance, formatage, storage)
  pages/             Une page par route
  types.ts           Modèle de données (Delivery, Driver, statuts)
```

## Modèle de données

```ts
interface Delivery {
  id: string;                 // "DL-1042"
  customerName: string;
  reference?: string;
  amount?: number;
  notes?: string;
  status: "waiting_location" | "location_received" | "delivered";
  shareUrl: string;           // "/d/DL-1042"
  customerLatitude?: number;
  customerLongitude?: number;
  driverLatitude: number;
  driverLongitude: number;
  createdAt: string;
  linkSentAt?: string;
  linkOpenedAt?: string;
  locationReceivedAt?: string;
  completedAt?: string;
  timeline: { id: string; label: string; timestamp: string }[];
}
```

## Routes

| Route                | Accès       | Description                              |
|-----------------------|-------------|-------------------------------------------|
| `/`                   | Public      | Landing page                              |
| `/login`, `/signup`   | Public      | Authentification simulée                  |
| `/dashboard`          | Livreur     | Tableau de bord + statistiques            |
| `/deliveries`         | Livreur     | Liste filtrable des livraisons            |
| `/deliveries/:id`     | Livreur     | Détail, carte, navigation, historique     |
| `/create-delivery`    | Livreur     | Création rapide + génération du lien      |
| `/profile`            | Livreur     | Profil, plan, usage                       |
| `/d/:deliveryId`      | **Public**  | Page client — partage de position en un tap |

La route `/d/:deliveryId` ne nécessite aucune authentification : c'est celle
que reçoit le client final sur WhatsApp.

## Limites connues (prototype)

- Aucun vrai backend : tout est simulé en mémoire/`localStorage`.
- L'authentification n'effectue aucune vérification réelle.
- Les paiements (passage au plan Pro) sont simulés, sans intégration réelle.
- Le tracé entre livreur et client est une ligne droite (pas un vrai
  itinéraire routier).
