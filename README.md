# Volière Manager

Monorepo **Yarn 4** : application web (React / Vite), mobile (Expo) et code partagé (`packages/shared`), avec configuration **Firebase** (Auth, Firestore, règles).

## Documentation


| Document | Description |
| --- | --- |
| [Cahier des charges](docs/Cahier_de_charge.md) | Cahier de charge. |
| [Conception](docs/CONCEPTION.md) | Conception : objectifs, règles métier, MCD, Firestore, visualisation. |
| [Architecture technique web (DTS-02)](docs/DTS-02-ARCHITECTURE-TECHNIQUE-WEB.md) | Architecture technique de l’app web (stack, routes, `@shared`). |
| [Installation et configuration (DTS-03)](docs/DTS-03-INSTALLATION-ET-CONFIGURATION.md) | Installation, variables d’environnement, scripts, build. |
| [Manuel utilisateur web (DTS-04)](docs/DTS-04-MANUEL-UTILISATEUR-WEB.md) | Manuel utilisateur (parcours écrans web). |
| [Déploiement démo et production](docs/DEPLOYEMENT-DEMO-ET-PROD.md) | Démo GitHub Pages, prod Firebase Hosting, `VITE_BASE`, build web. |
| [Sécurité et déploiement (DTS-05)](docs/DTS-05-SECURITE-REGLES-ET-DEPLOIEMENT.md) | Sécurité, règles Firestore, déploiement. |
| [Tests, qualité et évolutions (DTS-06)](docs/DTS-06-TESTS-QUALITE-ET-EVOLUTIONS.md) | Tests, qualité, évolutions possibles. |


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

