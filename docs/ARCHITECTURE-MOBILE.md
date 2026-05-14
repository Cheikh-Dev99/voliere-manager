# Architecture technique — Mobile

Ce document décrit l’app **Expo** (`apps/mobile/`), son **empilement technique** et l’intégration **`@shared`** (`packages/shared`).

- **Parcours utilisateur** (connexion, onglets, actions) : [Manuel utilisateur — Mobile](./MANUEL-UTILISATEUR-MOBILE.md).
- **Comparaison avec le web** (routes, layout) : [Architecture technique — Web](./ARCHITECTURE-WEB.md).

## 1. Stack et rôle dans le monorepo

| Couche | Technologie |
|--------|-------------|
| Runtime | React 19, React Native (Expo SDK ~54) |
| Navigation | Expo Router (dossiers sous `app/`) |
| Formulaires | react-hook-form, Zod |
| Données | Firebase Auth + Firestore (SDK 12), mêmes collections que le web |
| Partagé | Alias **`@shared`** → `packages/shared` (hooks, services, types, utilitaires) |

Les règles Firestore et le modèle de données sont identiques au web ; seule l’UI diffère.

## 2. Arborescence utile `apps/mobile/`

| Zone | Rôle |
|------|------|
| `app/_layout.tsx` | Racine Expo Router, thème, pile globale. |
| `app/(auth)/` | Connexion (`login.tsx`). |
| `app/(app)/_layout.tsx` | Zone authentifiée (pile principale). |
| `app/(app)/(tabs)/` | **Onglets** : Visualisation, Cages, Pigeons, Couples, Reproductions, Sorties. |
| `app/(app)/(tabs)/mobile-nav.tsx` | Écran utilitaire (onglet masqué dans la barre, `href: null`). |
| `app/(app)/pigeon/` | Fiche, modification, santé, généalogie. |
| `app/(app)/couple/` | Détail, nouveau couple. |
| `app/(app)/reproduction/` | Détail, nouvelle reproduction. |
| `app/(app)/sortie/` | Détail, nouvelle sortie. |
| `app/(app)/cage/` | Détail cage, édition, historique, nouvelle cage. |
| `components/` | UI mobile (en-têtes, décor, menus). |
| `constants/theme.ts` | Couleurs et style communs. |

## 3. Onglets principaux (après connexion)

| Onglet | Fichier typique | Contenu fonctionnel |
|--------|-----------------|---------------------|
| Volière (Visualisation) | `(tabs)/index.tsx` | Grille des cages (codes couleur comme sur le web). |
| Cages | `(tabs)/cages.tsx` | Liste / accès aux fiches cage. |
| Pigeons | `(tabs)/pigeons.tsx` | Liste, archivage, **export CSV** des lignes affichées (partage système). |
| Couples | `(tabs)/couples.tsx` | Liste avec filtre statut ; **actifs par défaut** (détails : section *Couples actifs* ci-dessous). |
| Repro. | `(tabs)/reproductions.tsx` | Portées liées aux couples. |
| Sorties | `(tabs)/sorties.tsx` | Sorties de pigeons. |

En-tête : menu utilisateur (`UserMenuHeader`) cohérent avec le profil et la déconnexion.

## 4. Présentation visuelle (filigrane)

Sur les **six** écrans liste d’onglets (Volière, Cages, Pigeons, Couples, Reproductions, Sorties), un décor type **filigrane** (`SiteBackgroundDecor`) est affiché en arrière-plan, comme sur le web (`AppLayout` avec chemins `/`, `/cages`, etc.). Les écrans profonds (fiches, formulaires) utilisent un fond uni pour la lisibilité.

## 5. Couples actifs (sélecteurs et compteurs)

Le hook partagé **`useCouples(actifsSeulement)`** (`packages/shared/hooks/useCouples.ts`) :

- avec **`true`** : ne garde que les documents au statut **`ACTIF`** (couple en cours, non rompu) ;
- avec **`false`** : tous les couples du compte (utile pour l’historique, résolution par id sur la volière, reproductions passées).

Les formulaires et listes qui concernent uniquement des **choix de couples encore valides** utilisent `useCouples(true)`. L’onglet **Couples** conserve en général un filtre UI pour afficher aussi les couples **rompus** ou **tous**, selon l’écran.

## 6. Configuration et démarrage

1. Copier **`apps/mobile/.env.example`** vers **`.env`** (à la racine du workspace mobile) et renseigner **`EXPO_PUBLIC_FIREBASE_*`** (même projet Firebase que le web).
2. Depuis la racine **`voliere-manager/`** : `yarn mobile` (équivalent : `yarn workspace @voliere/mobile start`).
3. Depuis **`apps/mobile/`** : `yarn start` ou `yarn mobile`.

Vérification TypeScript (sans build natif) :

```bash
cd apps/mobile
npx tsc --noEmit
```

## 7. Déploiement et exports

- Builds store : **EAS Build** (comptes Apple / Google Play hors périmètre de ce dépôt).
- Export **CSV** pigeons : fichier généré via `@shared/utils/pigeonCsv` puis partagé avec **`expo-sharing`** ; tester sur appareil ou émulateur avec services adaptés.

---

Pour l’installation détaillée (Node, Yarn, Firebase), voir [Installation et configuration](./INSTALLATION-ET-CONFIGURATION.md).
