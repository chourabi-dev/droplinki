# DropLink

Plateforme de partage de position pensée pour les livreurs.
**"Pas d'appel. Pas d'itinéraire à décrire. Juste un lien."**

Le livreur crée une livraison → envoie un lien unique par WhatsApp → le client
ouvre le lien (sans compte, sans application) → il appuie sur un bouton pour
partager sa position → le livreur voit la position exacte sur une carte et
ouvre Google Maps en un tap.

Ce dépôt est le **frontend** de l'application. Il communique avec un backend
Symfony via une API REST — voir [Backend API contract](#backend-api-contract)
ci-dessous pour la liste exacte des routes attendues.

> **Statut backend :** au moment de cette intégration, les routes de l'API
> Symfony ne sont pas encore implémentées. Le frontend est entièrement câblé
> pour les consommer (aucune donnée simulée / mock côté client), mais tant que
> le backend n'expose pas ces routes, les appels échoueront avec une erreur
> réseau claire affichée à l'utilisateur ("Impossible de joindre le
> serveur..."). C'est le comportement attendu tant que le backend n'est pas
> prêt.

---

## Stack technique

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Leaflet / Leaflet (OpenStreetMap) pour les cartes
- lucide-react pour les icônes
- Google Identity Services pour "Se connecter avec Google"

## Installation et lancement

Prérequis : Node.js 18+, npm, et le backend Symfony lancé sur
`https://droplinki-backend.chourabi-e-business-solutions.com/` (ou une autre URL — voir configuration ci-dessous).

```bash
cp .env.example .env
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
> s'afficher correctement.

### Configuration (`.env`)

| Variable                  | Description                                                        | Défaut                  |
|---------------------------|----------------------------------------------------------------------|--------------------------|
| `VITE_API_BASE_URL`       | URL de base du backend Symfony                                       | `https://droplinki-backend.chourabi-e-business-solutions.com/` |
| `VITE_GOOGLE_CLIENT_ID`   | OAuth Client ID Google (Google Identity Services) pour le bouton Google Sign-In | *(vide — bouton masqué)* |
| `VITE_PUSHER_KEY`         | Clé d'app Pusher Channels (temps réel)                                | *(vide — temps réel désactivé)* |
| `VITE_PUSHER_CLUSTER`     | Cluster Pusher (ex. `eu`, `mt1`)                                      | *(vide — temps réel désactivé)* |

Le Client ID Google se crée depuis la
[Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
(type "OAuth client ID" → "Web application"). Ajoutez l'origine du frontend
(ex. `http://localhost:5173`) dans "Authorized JavaScript origins".

---

## Structure du projet

```
src/
  components/       Composants UI réutilisables (carte, cartes de livraison,
                     en-tête, barre de navigation mobile, mockup du hero...)
  components/ui/     Primitives (Button, Card, Input, Textarea)
  context/           État applicatif (Auth, Deliveries, Toasts) — branché sur l'API
  lib/               api.ts (client HTTP + endpoints), googleAuth.ts (Google
                     Identity Services), utils.ts (formatage, distances)
  pages/             Une page par route
  types.ts           Modèle de données (Delivery, Driver, statuts)
```

## Modèle de données (frontend)

```ts
interface Delivery {
  id: string;                 // "DL-1042"
  customerName: string;
  customerPhone: string;      // requis à la création — utilisé pour WhatsApp/SMS
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

interface Driver {
  id?: string;
  name: string;
  phone?: string;
  email: string;
  plan: "free" | "pro";
}
```

## Routes frontend

| Route                  | Accès       | Description                                   |
|-------------------------|-------------|------------------------------------------------|
| `/`                     | Public      | Landing page                                    |
| `/login`                | Public      | Connexion (email/mot de passe + Google)         |
| `/signup`               | Public      | Création de compte (+ Google)                   |
| `/forgot-password`      | Public      | Demande de lien de réinitialisation             |
| `/reset-password?token=`| Public      | Choix d'un nouveau mot de passe                 |
| `/dashboard`            | Livreur     | Tableau de bord + statistiques                  |
| `/deliveries`           | Livreur     | Liste filtrable des livraisons                  |
| `/deliveries/:id`       | Livreur     | Détail, carte, navigation, historique           |
| `/create-delivery`      | Livreur     | Création (nom, **téléphone**, réf., montant...) |
| `/profile`              | Livreur     | Profil, plan, usage                             |
| `/d/:deliveryId`        | **Public**  | Page client — partage de position en un tap     |

Les routes `/d/:deliveryId`, `/forgot-password` et `/reset-password` ne
nécessitent aucune authentification.

---

## Backend API contract

Le frontend attend une API REST JSON sous `VITE_API_BASE_URL` (ex.
`https://droplinki-backend.chourabi-e-business-solutions.com/`). Toutes les routes authentifiées attendent un header
`Authorization: Bearer <token>`. Le contrat ci-dessous est ce que le client
appelle aujourd'hui (`src/lib/api.ts`) — il sert de spécification pour
l'implémentation Symfony.

### Auth — `/api/auth`

| Méthode | Route                        | Auth | Payload                                   | Réponse                        |
|---------|-------------------------------|------|--------------------------------------------|----------------------------------|
| POST    | `/api/auth/register`         | non  | `{ name, phone, email, password }`         | `{ token, user }`                |
| POST    | `/api/auth/login`            | non  | `{ email, password }`                      | `{ token, user }`                |
| POST    | `/api/auth/google`           | non  | `{ credential }` (Google ID token)         | `{ token, user }`                |
| GET     | `/api/auth/me`               | oui  | —                                            | `user`                           |
| POST    | `/api/auth/forgot-password`  | non  | `{ email }`                                | `{ message }`                    |
| POST    | `/api/auth/reset-password`   | non  | `{ token, password }`                      | `{ message }`                    |

`user` = `{ id, name, phone?, email, plan: "free" | "pro" }`.

Pour `/api/auth/google` : le backend doit vérifier le `credential` (JWT
Google) auprès de Google, créer le compte s'il n'existe pas encore
(email/nom depuis le token), puis retourner un token de session applicatif
comme pour un login classique.

Pour `/api/auth/forgot-password` : renvoyer toujours `{ message }` avec un
code 200 que l'email existe ou non (ne pas révéler l'existence d'un compte).

### Livraisons — `/api/deliveries` (authentifié, scope = livreur connecté)

| Méthode | Route                                | Payload                                                        | Réponse       |
|---------|----------------------------------------|-------------------------------------------------------------------|-----------------|
| GET     | `/api/deliveries`                     | —                                                                 | `Delivery[]`    |
| POST    | `/api/deliveries`                     | `{ customerName, customerPhone, reference?, amount?, notes? }`   | `Delivery`      |
| GET     | `/api/deliveries/{id}`                | —                                                                 | `Delivery`      |
| PATCH   | `/api/deliveries/{id}/delivered`      | —                                                                 | `Delivery`      |

`customerPhone` est **requis** à la création (utilisé pour le lien
WhatsApp/SMS envoyé au client).

### Suivi client — `/api/public/deliveries` (public, sans authentification)

| Méthode | Route                                             | Payload                          | Réponse    |
|---------|-----------------------------------------------------|-------------------------------------|--------------|
| GET     | `/api/public/deliveries/{id}`                     | —                                   | `Delivery`   |
| POST    | `/api/public/deliveries/{id}/opened`               | —                                   | `204`        |
| POST    | `/api/public/deliveries/{id}/location`             | `{ latitude, longitude }`          | `Delivery`   |

Ces routes sont appelées depuis la page `/d/:deliveryId` ouverte par le
client final (aucun token) : elles doivent donc rester accessibles sans
authentification, mais scoper l'accès strictement à l'`id` de livraison
fourni (pas de liste, pas d'énumération).

### Abonnement — `/api/driver`

| Méthode | Route                  | Auth | Réponse |
|---------|--------------------------|------|-----------|
| POST    | `/api/driver/upgrade`   | oui  | `Driver`  |

### Erreurs

Toute réponse non-2xx doit être un JSON `{ message: string }` (le frontend
l'affiche directement à l'utilisateur). En l'absence de JSON, le frontend
affiche un message générique `Erreur serveur (<status>)`.

---

## Temps réel (Pusher Channels)

La liste des livraisons (`/deliveries`) et le détail d'une livraison
(`/deliveries/:id`, avec sa carte) se mettent à jour **automatiquement**,
sans rechargement ni polling, dès que le client :

- ouvre le lien de suivi (`/d/:deliveryId`) ;
- partage sa position ;
- (et la livraison passe "livrée").

Le frontend est déjà entièrement câblé côté client
(`src/lib/pusher.ts` + `src/context/DeliveryContext.tsx`) : il se connecte à
Pusher avec `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER` et s'abonne, pour le
livreur connecté, au **canal privé** :

```
private-driver-{driverId}
```

Il écoute l'événement **`delivery.updated`**, dont le payload attendu est
l'objet `Delivery` complet et à jour (même forme que les réponses REST
ci-dessus). Le frontend fusionne ce payload dans son état local, ce qui
rafraîchit à la fois la liste et la page de détail (elles partagent le même
contexte).

**Ce qui reste à faire côté Symfony :**

1. **Broadcaster `delivery.updated`** sur `private-driver-{driverId}` (via le
   SDK serveur Pusher, ex. `pusher/pusher-http-php`) à chaque fois que l'une
   des livraisons de ce livreur change, en particulier après :
   - `POST /api/open/deliveries/{id}/opened`
   - `POST /api/open/deliveries/{id}/location`
   - `PATCH /api/deliveries/{id}/delivered`

2. **Exposer une route d'authentification des canaux privés :**

   | Méthode | Route              | Auth | Payload                              | Réponse                    |
   |---------|---------------------|------|-----------------------------------------|------------------------------|
   | POST    | `/api/pusher/auth` | oui  | `socket_id`, `channel_name` (form-encoded, envoyés par Pusher.js) | réponse signée du SDK serveur Pusher |

   Cette route doit vérifier le token `Authorization: Bearer`, s'assurer que
   `channel_name` correspond bien à `private-driver-{id du livreur
   authentifié}` (jamais celui d'un autre livreur), puis renvoyer la réponse
   générée par `Pusher::authorizeChannel($channel_name, $socket_id)`.

Si `VITE_PUSHER_KEY` / `VITE_PUSHER_CLUSTER` ne sont pas renseignées, le
temps réel est simplement désactivé (aucune erreur) et l'app se comporte
comme avant (rafraîchissement manuel / au chargement de la page).

---

## Authentification Google (frontend)

Le bouton "Continuer avec Google" utilise
[Google Identity Services](https://developers.google.com/identity/gsi/web)
chargé dynamiquement (`src/lib/googleAuth.ts`). Il n'apparaît que si
`VITE_GOOGLE_CLIENT_ID` est renseigné. Au clic, Google renvoie un ID token
(JWT) que le frontend transmet tel quel à `POST /api/auth/google` — c'est au
backend de le valider (audience = client ID, signature Google) avant de
créer la session.

## Limites connues

- Le tracé entre livreur et client est une ligne droite (pas un vrai
  itinéraire routier).
- Les routes backend listées ci-dessus ne sont pas encore implémentées côté
  Symfony ; le frontend gère cet état (erreurs réseau affichées proprement)
  mais ne peut pas fonctionner de bout en bout tant qu'elles ne le sont pas.
