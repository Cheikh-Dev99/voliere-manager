# Déploiement — Démo GitHub Pages et production Firebase

Ce document complète [Sécurité, règles Firestore et déploiement](./SECURITE-REGLES-ET-DEPLOIEMENT.md) avec une procédure concrète pour le **front web**.

**Démo en ligne (jury)** : [https://cheikh-dev99.github.io/voliere-manager/](https://cheikh-dev99.github.io/voliere-manager/)

## 1. Prérequis

- Projet Firebase (Auth, Firestore, Storage).
- Fichier **`apps/web/.env.production`** (non versionné) avec les clés `VITE_FIREBASE_*` et `VITE_BASE` (voir § 3).
- Node.js et Yarn 4 installés (voir [Installation et configuration](./INSTALLATION-ET-CONFIGURATION.md)).

## 2. Build web (local)

À la racine `voliere-manager/` :

```bash
cd apps/web
yarn install
yarn build
```

Les fichiers statiques sont dans **`apps/web/dist/`** (`index.html`, `404.html`, `.nojekyll`, `assets/`).

## 3. Démo GitHub Pages

GitHub Pages sert ce projet sous un **sous-chemin** :

`https://<utilisateur>.github.io/<nom-du-depot>/`

Pour ce dépôt : `https://cheikh-dev99.github.io/voliere-manager/`

### 3.1 Fichier `apps/web/.env.production`

Créer (ou mettre à jour) ce fichier **avant chaque build Pages**. Ne pas le committer.

Exemple pour le dépôt `voliere-manager` :

```env
VITE_BASE=/voliere-manager/
VITE_FIREBASE_API_KEY=<votre_clé>
VITE_FIREBASE_AUTH_DOMAIN=voliere-manager.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=voliere-manager
VITE_FIREBASE_STORAGE_BUCKET=voliere-manager.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<id>
VITE_FIREBASE_APP_ID=<id_web>
VITE_FIREBASE_GOOGLE_WEB_CLIENT_ID=<client_oauth_web>
```

| Variable | Rôle |
|----------|------|
| `VITE_BASE` | Préfixe des assets (`/voliere-manager/`). **Doit** correspondre au nom exact du dépôt GitHub (slashes comme ci-dessus). |
| `VITE_FIREBASE_*` | Config Firebase injectée au build (voir `apps/web/vite.config.js` et `packages/shared/firebase/config.ts`). |

Le **`BrowserRouter`** utilise `import.meta.env.BASE_URL` (`apps/web/src/main.jsx`), aligné sur `VITE_BASE` par Vite.

### 3.2 Réglage GitHub (obligatoire)

Dans le dépôt GitHub : **Settings → Pages**

| Champ | Valeur |
|-------|--------|
| **Source** | Deploy from a branch |
| **Branch** | `gh-pages` |
| **Folder** | `/ (root)` |

**Ne pas** publier depuis la branche `main` : GitHub affiche alors le **README** du dépôt (tableau APK, liens `docs/`), pas l’application React.

Attendre 1 à 2 minutes après chaque publication, puis tester l’URL avec un rechargement forcé (**Ctrl+Shift+R**).

### 3.3 Déploiement automatique (GitHub Actions)

Le workflow **`.github/workflows/deploy-pages.yml`** publie le site à chaque **push sur `main`** qui modifie le web ou le code partagé (`apps/web/`, `packages/shared/`, etc.).

1. **Configurer les secrets** (une seule fois) : **Settings → Environments → github-pages → Environment secrets** (recommandé), ou **Secrets and variables → Actions** (secrets du dépôt). Créer :

| Secret | Valeur (identique à `.env.production`) |
|--------|----------------------------------------|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase Web |
| `VITE_FIREBASE_AUTH_DOMAIN` | ex. `voliere-manager.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ex. `voliere-manager` |
| `VITE_FIREBASE_STORAGE_BUCKET` | ex. `voliere-manager.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID expéditeur |
| `VITE_FIREBASE_APP_ID` | ID application web |
| `VITE_FIREBASE_GOOGLE_WEB_CLIENT_ID` | Client OAuth Web (connexion Google) |

`VITE_BASE=/voliere-manager/` est défini dans le workflow (adapter le workflow si le dépôt est renommé).

2. **Pousser sur `main`** : l’onglet **Actions** affiche le job *Deploy GitHub Pages*. En cas de succès, la branche `gh-pages` est mise à jour sous 1 à 2 minutes.

3. **Lancer à la main** : Actions → *Deploy GitHub Pages* → **Run workflow** (utile après avoir ajouté les secrets).

> Les secrets ne sont **pas** lus depuis `.env.production` (fichier local non versionné). Ils doivent exister côté GitHub pour la CI.

### 3.4 Publication manuelle (optionnel)

Si vous préférez déployer depuis votre machine (sans attendre la CI) :

```bash
yarn deploy:pages
```

Étapes : build avec `apps/web/.env.production`, copie `404.html`, push de `dist/` sur `gh-pages`.

### 3.5 Firebase Authentication

Console Firebase → **Authentication** → **Paramètres** → **Domaines autorisés** :

- `cheikh-dev99.github.io` (ou votre domaine `*.github.io`)
- `localhost` (développement local)

### 3.6 Connexion Google (optionnel)

Google Cloud Console → identifiants OAuth 2.0 (client Web) → **Origines JavaScript autorisées** :

- `http://localhost:5173`
- `https://cheikh-dev99.github.io`

### 3.7 Vérifications après déploiement

1. Ouvrir [https://cheikh-dev99.github.io/voliere-manager/](https://cheikh-dev99.github.io/voliere-manager/) : écran de **connexion** Volière Manager (thème **clair** par défaut).
2. Onglet **Réseau** (F12) : les fichiers `/voliere-manager/assets/index-*.js` et `.css` répondent **200**.
3. Console : pas d’erreur `Firebase: Error (auth/invalid-api-key)`.
4. Ne pas confondre avec la page du dépôt : `https://github.com/Cheikh-Dev99/voliere-manager` (README GitHub).

### 3.8 Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| Page README / documentation | Source Pages = branche `main` | Repasser sur `gh-pages` + `/ (root)` |
| Page blanche, `invalid-api-key` | Clés Firebase absentes au build ou garde `process` (corrigé dans `config.ts`) | Vérifier `.env.production`, `yarn build`, `yarn deploy:pages` |
| Assets 404 (`/assets/...` sans préfixe) | Build sans `VITE_BASE` | Ajouter `VITE_BASE=/voliere-manager/` et rebuild |
| Ancienne version en cache | CDN / navigateur | Ctrl+Shift+R ou navigation privée |
| 404 sur `/voliere-manager/pigeons` au F5 | Limite GitHub Pages (SPA) | Navigation depuis l’accueil, ou héberger sur Firebase Hosting |
| CI en échec au build | Secret Actions manquant ou mal nommé | Vérifier les 7 secrets § 3.3 et les logs du job *Build web* |
| Push sur `main` sans mise à jour du site | Fichiers hors `paths` du workflow | Modifier `apps/web` ou lancer *Run workflow* manuellement |

## 4. Production Firebase Hosting

Le fichier racine **`firebase.json`** inclut une section `hosting` pointant vers `apps/web/dist` avec réécriture SPA vers `index.html`.

### 4.1 Variables de build

- App à la **racine** du domaine (`https://monapp.web.app/`) : ne pas définir `VITE_BASE` (ou `VITE_BASE=/`).
- App en **sous-chemin** : même règle que GitHub Pages (`VITE_BASE=/mon-chemin/`).

### 4.2 Commandes

```bash
cd voliere-manager
cd apps/web && yarn build && cd ../..
firebase deploy --only hosting
```

Déployer aussi les règles et index avant la mise en production :

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Les photos pigeons (Storage) ne sont lisibles que par l’utilisateur authentifié propriétaire du dossier (`firebase/storage.rules`). Voir [Sécurité, règles Firestore et déploiement](./SECURITE-REGLES-ET-DEPLOIEMENT.md).

## 5. Mobile (rappel)

- **Expo EAS Build** pour APK/AAB ou builds iOS ; variables `EXPO_PUBLIC_FIREBASE_*` (voir [Installation et configuration — § 5.2](./INSTALLATION-ET-CONFIGURATION.md#build-apk-eas)).
- **APK** : [`Volière Manager.apk`](../Volière%20Manager.apk) à la racine du monorepo.
- L’export CSV utilise `expo-sharing` : tester sur appareil réel si besoin.

---
