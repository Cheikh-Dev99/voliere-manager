# 6. Tests, qualité et évolutions

## 6.1 Tests automatisés (package partagé)

La logique métier et utilitaires dans **`packages/shared`** sont couverts par des tests **Vitest** (configuration `vitest.config.ts`).

Lancement depuis la racine `voliere-manager` :

```bash
yarn test
```

Cela exécute `yarn workspace @voliere/shared test` (voir `package.json` racine).

**Exemples** de fichiers de tests : `packages/shared/utils/voliereCageList.test.ts`, etc.

> Pour le dossier DTS : indiquer le **nombre de tests** et un **extrait de résultat** (capture terminal ou rapport CI) dans les annexes du rendu.

## 6.2 Qualité statique — Web

Dans **`apps/web`** :

```bash
yarn lint
```

ESLint avec plugins React / hooks (voir `package.json` du workspace web). Corriger les avertissements avant livraison jury si exigé.

## 6.3 Typage

- Le workspace **web** utilise principalement **JavaScript** (`.jsx`) avec JSDoc ponctuel.
- Le workspace **shared** utilise **TypeScript** pour les services et types exportés.

## 6.4 Limites connues et dette documentaire

- **Historique cage** (sous-collection `evenements`) : prévu dans les règles Firestore pour `cages/{id}/evenements` ; l’exposition complète dans l’UI peut être itérative (cf. `CONCEPTION.md`).
- **Couverture de tests** : concentrée sur `packages/shared` ; les pages React peuvent être enrichies avec **Testing Library** si le cahier DTS l’exige explicitement.
- **Accessibilité** : amélioration continue (ARIA sur composants clés, contrastes) — relevé utile pour une grille d’évaluation « qualité UI ».

## 6.5 Pistes d’évolution

| Piste | Description |
|-------|-------------|
| Tests E2E | Playwright ou Cypress sur parcours critique (login → création pigeon → visualisation). |
| i18n | Internationalisation (fr/en) si public élargi. |
| Mode hors-ligne | Cache Firestore persistant (complexité accrue). |
| Rôles | Gérant / propriétaire multi-boutiques (hors modèle actuel mono-`ownerUid`). |
| Rapports PDF | Export inventaire, généalogie pour associations.

## 6.6 Checklist « prêt pour jury »

- [ ] `yarn install` propre sur machine vierge + `yarn build` web OK.
- [ ] `.env.example` à jour ; aucun secret dans Git.
- [ ] Règles Firestore déployées sur le projet de démo.
- [ ] Compte de démo ou vidéo screencast du parcours utilisateur.
- [ ] Documentation à jour (ce dossier `docs/`) + captures insérées dans le PDF final.
- [ ] `yarn test` vert.

---
