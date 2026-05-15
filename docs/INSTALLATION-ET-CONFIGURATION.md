# Installation et configuration

## 1. Prérequis

- **Node.js** LTS (18+ ou 20+ recommandé), installé sur la machine de développement.
- **Yarn 4** (Berry), cohérent avec `packageManager` dans `voliere-manager/package.json` (`yarn@4.6.0`). Activer avec `corepack enable` puis `corepack prepare yarn@4.6.0 --activate` si besoin.
- Un **projet Firebase** (Authentication e-mail/mot de passe activé, Firestore créé, règles déployées).

## 2. Cloner et installer les dépendances

À la racine du monorepo `voliere-manager/` :

```bash
cd voliere-manager
yarn install
```

Cela installe les dépendances pour **tous** les workspaces (`apps/*`, `packages/*`).

## 3. Configuration Firebase (web)

1. Dans la [Console Firebase](https://console.firebase.google.com/), créer ou sélectionner un projet.
2. Activer **Authentication** → **E-mail / mot de passe** et **Google** (fournisseur Google).
3. Créer une base **Firestore** en mode production (ou test avec précaution).
4. Déployer les **règles** du dépôt : fichier `firebase/firestore.rules` (voir [Sécurité, règles Firestore et déploiement](./SECURITE-REGLES-ET-DEPLOIEMENT.md)).
5. Récupérer la **config Web** : Paramètres du projet → Tes applications → Appli web → objet `firebaseConfig`.

Dans `apps/web/`, copier le fichier d’exemple :

```bash
cp apps/web/.env.example apps/web/.env.local
```

Renseigner les variables `VITE_FIREBASE_*` dans `apps/web/.env.local` (voir commentaires dans `.env.example`).

### 3.1 Domaines autorisés (mot de passe oublié)

Pour le lien de réinitialisation qui redirige vers ton app, ajouter dans Firebase **Authentication → Paramètres → Domaines autorisés** les origines utilisées en dev, par exemple :

- `localhost`
- `127.0.0.1`
- ton domaine de production éventuel

Sinon, l’API peut renvoyer `auth/unauthorized-continue-uri` (l’app web gère partiellement ce cas avec repli sans `continueUrl` — voir `LoginPage`).

## 4. Lancer l’application web en développement

Depuis la racine du monorepo :

```bash
yarn workspace web dev
```

Ou depuis `apps/web/` :

```bash
yarn dev
# ou
yarn web
```

Par défaut Vite écoute sur `http://localhost:5173` (vérifier la sortie du terminal).

## 5. Application mobile (Expo)

1. Même prérequis Node / Yarn / projet Firebase que pour le web.
2. Dans `apps/mobile/`, copier l’exemple d’environnement :

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

3. Renseigner les variables `EXPO_PUBLIC_FIREBASE_*` dans `apps/mobile/.env.local` (même projet que le web, préfixe obligatoire Expo pour exposition au bundle).
4. Pour **Google sur mobile** :
   - Copier l’**ID client Web** dans `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`apps/mobile/.env.local`).
   - Dans [Google Cloud Console](https://console.cloud.google.com/) → **API et services** → **Identifiants** → client OAuth **Application Web** (même ID que ci-dessus) → **URI de redirection autorisées**, ajouter :
     - **Expo Go** : `https://auth.expo.io/@cheikhdev99/voliere-manager` (adapter `owner` / `slug` de `apps/mobile/app.json`).
     - **Build natif** : `voliere-manager://oauthredirect`
   - Écran de consentement OAuth : en mode **Test**, ajouter ton compte Google comme **utilisateur test**.

### 5.1 Lancer Expo en développement

Depuis la racine du monorepo :

```bash
yarn mobile
```

Ou depuis `apps/mobile/` :

```bash
yarn start
```

Détail technique mobile : [Architecture technique — Mobile](./ARCHITECTURE-MOBILE.md) ; parcours utilisateur : [Manuel utilisateur — Mobile](./MANUEL-UTILISATEUR-MOBILE.md).

### 5.2 Build APK / AAB (EAS) {#build-apk-eas}

1. Installer EAS CLI : `npm i -g eas-cli` puis `eas login`.
2. Depuis `apps/mobile/`, créer les secrets projet (liste dans `eas.env.example`) :

```bash
cd apps/mobile
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "VOTRE_CLE"
# … répéter pour chaque EXPO_PUBLIC_* du fichier eas.env.example
```

3. Google Cloud : sur le client OAuth **Web**, ajouter `voliere-manager://oauthredirect` (APK / build natif).
4. Générer l’APK:

```bash
cd apps/mobile
eas build --profile preview --platform android
```

5. Télécharger l’APK (remplacer `BUILD_ID` par l’identifiant affiché sur [expo.dev](https://expo.dev)) :

```bash
eas build:download --build-id BUILD_ID
```

6. **APK** — placer le fichier à la **racine du monorepo** (même niveau que `README.md`) :

| Élément | Chemin |
| --- | --- |
| Fichier | [`Volière Manager.apk`](../Volière%20Manager.apk) |
| Emplacement | racine du monorepo (`voliere-manager/Volière Manager.apk`, au même niveau que `README.md`) |

Exemple après téléchargement EAS :

```bash
mv ~/Downloads/VOTRE_BUILD.apk "../../Volière Manager.apk"
```

(Adapter le chemin source ; depuis `apps/mobile/`, la racine du monorepo est `../..`.)

Tu peux **renommer** le fichier (extension `.apk` obligatoire) sans casser l’installation. Pour une nouvelle version, remplacer ce fichier à la racine et mettre à jour le dépôt Git.

7. Tester sur appareil réel : copier l’APK sur le téléphone, installer (sources inconnues si demandé), puis vérifier connexion e-mail, Google et grille volière.

## 6. Scripts utiles (référence)

| Emplacement              | Commande                  | Effet                                                |
| ------------------------ | ------------------------- | ---------------------------------------------------- |
| Racine `voliere-manager` | `yarn workspace web dev`  | Serveur Vite (web), depuis la racine.                |
| Racine `voliere-manager` | `yarn mobile`             | Démarre Expo (workspace `@voliere/mobile`).          |
| Racine                   | `yarn test`               | Lance les tests Vitest du package `@voliere/shared`. |
| `apps/web`               | `yarn dev` / `yarn start` | Serveur de développement Vite.                       |
| `apps/web`               | `yarn build`              | Build production → `dist/`.                          |
| Racine                   | `yarn deploy:pages`       | Build + publication branche `gh-pages`.                |
| `apps/web`               | `yarn deploy:pages`       | Idem (workspace web).                                  |
| `apps/web`               | `yarn preview`            | Sert le build localement.                            |
| `apps/web`               | `yarn lint`               | ESLint sur le code web.                              |

## 7. Build de production (web)

### 7.1 Variables

- **Développement** : `apps/web/.env.local` (`VITE_FIREBASE_*` uniquement ; pas de `VITE_BASE` ou `VITE_BASE=/`).
- **GitHub Pages / hébergement sous-chemin** : créer `apps/web/.env.production` avec les mêmes clés Firebase **et** `VITE_BASE=/nom-du-depot/` (ex. `/voliere-manager/`). Voir le modèle commenté dans `apps/web/.env.example`.

### 7.2 Commandes

```bash
cd apps/web
yarn build
```

Les fichiers statiques sont générés dans `apps/web/dist/`.

**Publication GitHub Pages** (démo jury) :

```bash
# depuis la racine voliere-manager/
yarn deploy:pages
```

Procédure complète (réglages GitHub, Firebase, dépannage) : [Déploiement — démo et production](./DEPLOYEMENT-DEMO-ET-PROD.md).

Pour **Firebase Hosting** ou autre hébergeur statique, configurer le fallback vers `index.html` (routage SPA React Router).

## 8. Scripts d’administration (données)

À la racine, des scripts Node existent pour tâches ponctuelles (migration `ownerUid`, seed, etc.) — voir `package.json` racine (`seed:cages`, `migrate:owner-uid`, …). Ils supposent en général des **clés compte de service** (fichiers **non versionnés** — voir `.gitignore`).

---
