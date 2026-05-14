# Déploiement : démo (GitHub Pages) et production (Firebase Hosting)

Ce document complète [DTS-05-SECURITE-REGLES-ET-DEPLOIEMENT.md](./DTS-05-SECURITE-REGLES-ET-DEPLOIEMENT.md) avec une procédure concrète pour le front web.

## Prérequis

- Projet Firebase (Auth, Firestore, Storage) et domaines autorisés pour l’URL finale (Console Firebase → Authentication → Paramètres → Domaines autorisés).
- Fichier `apps/web/.env.production` (non versionné) avec les clés `VITE_FIREBASE_*` (voir [DTS-03-INSTALLATION-ET-CONFIGURATION.md](./DTS-03-INSTALLATION-ET-CONFIGURATION.md)).

## Build web

À la racine `voliere-manager/` :

```bash
cd apps/web
yarn install
yarn build
```

Les fichiers statiques sont dans `apps/web/dist/`.

## Démo / test : GitHub Pages

GitHub Pages sert souvent le site sous un **sous-chemin** du type `https://<user>.github.io/<nom-du-depot>/`. Le dépôt configure déjà :

- **`VITE_BASE`** dans Vite (`apps/web/vite.config.js`) : chemin public des assets.
- **`BrowserRouter` avec `basename`** (`apps/web/src/main.jsx`) : aligné sur `import.meta.env.BASE_URL` fourni par Vite.

### Étapes

1. Créer `apps/web/.env.production` avec les variables Firebase **et** la base du dépôt, par exemple :
   - `VITE_BASE=/voliere-manager/`  
   (remplace `voliere-manager` par le nom exact du dépôt GitHub ; garde les slashes comme indiqué.)

2. Rebuild : `yarn build` dans `apps/web`.

3. Publier le contenu de **`apps/web/dist/`** sur la branche ou le dossier Pages (selon ton réglage GitHub : *Project Settings → Pages*).

4. Dans la console Firebase, ajoute l’URL Pages (ex. `https://mon-org.github.io`) et, si besoin, l’URL complète avec sous-chemin, aux **domaines autorisés** Auth.

5. Vérifier les routes profondes (`/pigeons`, etc.) : une réécriture SPA côté GitHub n’est pas toujours disponible pour les *Project Pages* ; en cas de 404 au rechargement d’une sous-route, privilégie un déploiement sur **Firebase Hosting** ou un hébergeur avec réécriture vers `index.html`.

## Production : Firebase Hosting

Le fichier racine **`firebase.json`** inclut une section `hosting` pointant vers `apps/web/dist` avec réécriture SPA vers `index.html`.

### Variables de build

- Pour une app à la **racine** du domaine (`https://monapp.web.app/`), ne pas définir `VITE_BASE` (ou `VITE_BASE=/`).
- Pour un sous-chemin, définir `VITE_BASE` comme pour GitHub Pages.

### Commandes

```bash
cd voliere-manager
# Build avec .env.production adapté (VITE_BASE + Firebase)
cd apps/web && yarn build && cd ../..
firebase deploy --only hosting
```

Déployer aussi les règles si nécessaire : `firebase deploy --only firestore:rules,storage` (voir DTS-05).

## Mobile (rappel)

- **Expo EAS Build** pour APK/AAB ou builds iOS ; les mêmes variables `EXPO_PUBLIC_FIREBASE_*` que pour le développement.
- L’export CSV utilise `expo-sharing` : tester sur un appareil réel ou un émulateur avec services Google si besoin.
