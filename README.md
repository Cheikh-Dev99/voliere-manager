# Volière Manager

Monorepo **Yarn 4** : application web (React / Vite), mobile (Expo) et code partagé (`packages/shared`), avec configuration **Firebase** (Auth, Firestore, règles).

## Documentation


| Document | Description |
| --- | --- |
| [Cahier des charges](docs/Cahier_de_charge.md) | Cahier de charge. |
| [Conception](docs/CONCEPTION.md) | Conception : objectifs, règles métier, MCD, Firestore, visualisation. |
| [Architecture technique web](docs/ARCHITECTURE-TECHNIQUE-WEB.md) | Architecture technique de l’app web (stack, routes, `@shared`). |
| [Installation et configuration](docs/INSTALLATION-ET-CONFIGURATION.md) | Installation, variables d’environnement, scripts, build. |
| [Manuel utilisateur web](docs/MANUEL-UTILISATEUR-WEB.md) | Manuel utilisateur (parcours écrans web). |
| [Déploiement démo et production](docs/DEPLOYEMENT-DEMO-ET-PROD.md) | Démo GitHub Pages, prod Firebase Hosting, `VITE_BASE`, build web. |
| [Sécurité et déploiement](docs/SECURITE-REGLES-ET-DEPLOIEMENT.md) | Sécurité, règles Firestore, déploiement. |
| [Tests, qualité et évolutions](docs/TESTS-QUALITE-ET-EVOLUTIONS.md) | Tests, qualité, évolutions possibles. |


## Démarrage rapide

À la racine `**voliere-manager/`** :

```bash
yarn install
```

**Web** (dans `voliere-manager/apps/web/`) :

```bash
yarn web
```

**Mobile** (dans `voliere-manager/apps/mobile/`) :

```bash
yarn mobile
```

**Tests** (package partagé) :

```bash
yarn test
```

