# 3. Installation et configuration

## 3.1 Prérequis

- **Node.js** LTS (18+ ou 20+ recommandé), installé sur la machine de développement.
- **Yarn 4** (Berry), cohérent avec `packageManager` dans `voliere-manager/package.json` (`yarn@4.6.0`). Activer avec `corepack enable` puis `corepack prepare yarn@4.6.0 --activate` si besoin.
- Un **projet Firebase** (Authentication e-mail/mot de passe activé, Firestore créé, règles déployées).

## 3.2 Cloner et installer les dépendances

À la racine du monorepo **`voliere-manager/`** :

```bash
cd voliere-manager
yarn install
```

Cela installe les dépendances pour **tous** les workspaces (`apps/*`, `packages/*`).

## 3.3 Configuration Firebase (web)

1. Dans la [Console Firebase](https://console.firebase.google.com/), créer ou sélectionner un projet.
2. Activer **Authentication** → méthode **E-mail / mot de passe**.
3. Créer une base **Firestore** en mode production (ou test avec précaution).
4. Déployer les **règles** du dépôt : fichier `firebase/firestore.rules` (voir chapitre sécurité).
5. Récupérer la **config Web** : Paramètres du projet → Tes applications → Appli web → objet `firebaseConfig`.

Dans **`apps/web/`**, copier le fichier d’exemple :

```bash
cp apps/web/.env.example apps/web/.env.local
```

Renseigner les variables **`VITE_FIREBASE_*`** dans `apps/web/.env.local` (voir commentaires dans `.env.example`).

### Domaines autorisés (mot de passe oublié)

Pour le lien de réinitialisation qui redirige vers ton app, ajouter dans Firebase **Authentication → Paramètres → Domaines autorisés** les origines utilisées en dev, par exemple :

- `localhost`
- `127.0.0.1`
- ton domaine de production éventuel

Sinon, l’API peut renvoyer `auth/unauthorized-continue-uri` (l’app web gère partiellement ce cas avec repli sans `continueUrl` — voir `LoginPage`).

## 3.4 Lancer l’application web en développement

Depuis la racine du monorepo :

```bash
yarn workspace web dev
```

Ou depuis **`apps/web/`** :

```bash
yarn dev
# ou
yarn web
```

Par défaut Vite écoute sur **`http://localhost:5173`** (vérifier la sortie du terminal).

## 3.5 Scripts utiles (référence)

| Emplacement | Commande | Effet |
|-------------|----------|--------|
| Racine `voliere-manager` | `yarn mobile` | Démarre Expo (workspace mobile). |
| Racine | `yarn test` | Lance les tests Vitest du package `@voliere/shared`. |
| `apps/web` | `yarn dev` / `yarn start` | Serveur de développement Vite. |
| `apps/web` | `yarn build` | Build production → `dist/`. |
| `apps/web` | `yarn preview` | Sert le build localement. |
| `apps/web` | `yarn lint` | ESLint sur le code web. |

## 3.6 Build de production (web)

```bash
cd apps/web
yarn build
```

Les fichiers statiques sont générés dans **`apps/web/dist/`**. Ils peuvent être servis par **Firebase Hosting**, Netlify, Vercel, ou tout serveur HTTP statique, en configurant le **fallback** vers `index.html` pour le routage SPA (React Router).

## 3.7 Scripts d’administration (données)

À la racine, des scripts Node existent pour tâches ponctuelles (migration `ownerUid`, seed, etc.) — voir `package.json` racine (`seed:cages`, `migrate:owner-uid`, …). Ils supposent en général des **clés compte de service** (fichiers **non versionnés** — voir `.gitignore`).

---
