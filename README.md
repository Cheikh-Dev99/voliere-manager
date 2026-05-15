# Volière Manager

Monorepo **Yarn 4** : application web (React / Vite), mobile (Expo) et code partagé (`packages/shared`), avec configuration **Firebase** (Auth, Firestore, règles).

**Démo web (GitHub Pages)** : [https://cheikh-dev99.github.io/voliere-manager/](https://cheikh-dev99.github.io/voliere-manager/) — procédure de publication : [Déploiement — démo et production](docs/DEPLOYEMENT-DEMO-ET-PROD.md).

## Télécharger l’application mobile (APK / IPA)

| | |
| --- | --- |
| **Releases GitHub** | [**Dernière version**](https://github.com/cheikh-dev99/voliere-manager/releases/latest) — fichiers **`.apk`** (Android) et éventuellement **`.ipa`** (iOS) en pièces jointes, **sans** binaire versionné à la racine du dépôt. |
| **Usage** | Sur la page release : télécharger l’APK, le copier sur le téléphone, autoriser les sources inconnues si besoin, puis installer. |
| **Publier une nouvelle build** | [Releases mobiles — EAS + GitHub](docs/RELEASES-MOBILES.md) (workflow Actions ou commandes manuelles). Détail build : [Installation — § 5.2](docs/INSTALLATION-ET-CONFIGURATION.md#build-apk-eas). |

## Documentation

Toute la documentation détaillée est dans le dossier **`docs/`** (fichiers listés ci-dessous).

| Document | Description |
| --- | --- |
| [Cahier des charges](docs/CAHIER-DE-CHARGE.md) | Cahier de charge du projet. |
| [Conception](docs/CONCEPTION.md) | Objectifs, règles métier, MCD, Firestore, visualisation. |
| [Architecture technique — Web](docs/ARCHITECTURE-WEB.md) | Stack web, routes, intégration `@shared`. |
| [Architecture technique — Mobile](docs/ARCHITECTURE-MOBILE.md) | Expo Router, onglets, couples actifs, CSV, configuration. |
| [Installation et configuration](docs/INSTALLATION-ET-CONFIGURATION.md) | Installation, variables d’environnement, scripts, build web et mobile. |
| [Manuel utilisateur — Web](docs/MANUEL-UTILISATEUR-WEB.md) | Parcours utilisateur (écrans web). |
| [Manuel utilisateur — Mobile](docs/MANUEL-UTILISATEUR-MOBILE.md) | Parcours utilisateur (app Expo, onglets, fiches). |
| [Déploiement — démo et production](docs/DEPLOYEMENT-DEMO-ET-PROD.md) | GitHub Pages, Firebase Hosting, `VITE_BASE`, build web, rappels mobile. |
| [Releases mobiles](docs/RELEASES-MOBILES.md) | APK / IPA via **GitHub Releases** et EAS Build (pas de binaire à la racine). |
| [Sécurité, règles Firestore et déploiement](docs/SECURITE-REGLES-ET-DEPLOIEMENT.md) | Sécurité, règles Firestore, secrets. |
| [Tests, qualité et évolutions](docs/TESTS-QUALITE-ET-EVOLUTIONS.md) | Tests Vitest, lint, pistes d’évolution. |

## Démarrage rapide

À la racine `voliere-manager/` :

```bash
yarn install
```

**Web** — depuis la racine : `yarn workspace web dev` ; ou dans `apps/web/` : `yarn dev` / `yarn web` (serveur Vite, port affiché dans le terminal, souvent `http://localhost:5173`).

**Mobile** — depuis la racine : `yarn mobile` ; ou dans `apps/mobile/` : `yarn start`. Prévoir `apps/mobile/.env.local` avec les variables `EXPO_PUBLIC_FIREBASE_*` (voir `apps/mobile/.env.example` et [Installation et configuration](docs/INSTALLATION-ET-CONFIGURATION.md)).

**Tests** (package partagé) :

```bash
yarn test
```

**TypeScript** (`@shared` + mobile) :

```bash
yarn typecheck
```

