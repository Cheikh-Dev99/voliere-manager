# Volière Manager

Monorepo **Yarn 4** : application web (React / Vite), mobile (Expo) et code partagé (`packages/shared`), avec configuration **Firebase** (Auth, Firestore, règles).

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/Cahier_de_charge.md`](docs/Cahier_de_charge.md) | Cahier de charge. |
| [`docs/CONCEPTION.md`](docs/CONCEPTION.md) | Conception : objectifs, règles métier, MCD, Firestore, visualisation. |
| [`docs/DTS-02-ARCHITECTURE-TECHNIQUE-WEB.md`](docs/DTS-02-ARCHITECTURE-TECHNIQUE-WEB.md) | Architecture technique de l’app web (stack, routes, `@shared`). |
| [`docs/DTS-03-INSTALLATION-ET-CONFIGURATION.md`](docs/DTS-03-INSTALLATION-ET-CONFIGURATION.md) | Installation, variables d’environnement, scripts, build. |
| [`docs/DTS-04-MANUEL-UTILISATEUR-WEB.md`](docs/DTS-04-MANUEL-UTILISATEUR-WEB.md) | Manuel utilisateur (parcours écrans web). |
| [`docs/DTS-05-SECURITE-REGLES-ET-DEPLOIEMENT.md`](docs/DTS-05-SECURITE-REGLES-ET-DEPLOIEMENT.md) | Sécurité, règles Firestore, déploiement. |
| [`docs/DTS-06-TESTS-QUALITE-ET-EVOLUTIONS.md`](docs/DTS-06-TESTS-QUALITE-ET-EVOLUTIONS.md) | Tests, qualité, évolutions possibles. |

## Démarrage rapide

À la racine **`voliere-manager/`** :

```bash
yarn install
```

**Web** (après `apps/web/.env.local`) :

```bash
yarn workspace web dev
```

**Mobile** :

```bash
yarn mobile
```

**Tests** (package partagé) :

```bash
yarn test
```
