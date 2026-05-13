# 4. Manuel utilisateur — Application web Volière Manager

> **Alignement cahier DTS** : ce manuel détaille la **§5.2 Phase de réalisation** côté parcours utilisateur (modules web, navigation, authentification). Le texte officiel des exigences fonctionnelles est en **§5.2** du fichier [`Cahier_de_charge.md`](./Cahier_de_charge.md#dts-5).

Ce manuel décrit les **parcours utilisateur** de l’interface web. Les libellés de menu correspondent à la barre de navigation principale après connexion.

> **À compléter pour le jury** : insérer des **captures d’écran** numérotées (ex. fig. 1 — Écran de connexion) aux endroits indiqués par des marqueurs *[Capture]*.

## 4.1 Première visite — Connexion et inscription

### 4.1.1 Accès à la page d’authentification

- Ouvrir l’URL de l’application (ex. `http://localhost:5173/` en développement).
- Si tu n’es pas connecté, tu es redirigé vers **`/login`**.

### 4.1.2 Connexion

1. Onglet **Connexion** (icône grille).
2. Saisir **e-mail** et **mot de passe**.
3. Valider : en cas de succès, tu arrives sur la **Visualisation** (`/`), sauf **retour intelligent** (voir § 4.8).
4. En cas d’erreur (identifiants invalides), un message s’affiche ; les champs peuvent être mis en évidence.

*[Capture : page Connexion]*

### 4.1.3 Création de compte (inscription)

1. Onglet **Inscription**.
2. Renseigner **prénom**, **nom**, **e-mail**, **mot de passe** et **confirmation**.
3. Optionnel : **nom de la volière** (sinon une valeur par défaut métier peut s’appliquer côté profil).
4. Après validation, compte Firebase créé et session ouverte ; redirection vers la **Visualisation** (ou retour intelligent).

*[Capture : onglet Inscription]*

### 4.1.4 Mot de passe oublié

1. Onglet **Mot de passe oublié** (ou libellé raccourci « Oublié » sur mobile étroit).
2. Saisir l’**e-mail** du compte.
3. Recevoir un e-mail Firebase avec lien de réinitialisation (selon configuration des domaines autorisés).

*[Capture : onglet mot de passe oublié]*

### 4.1.5 Déconnexion

- Utiliser le **menu profil** (zone utilisateur en en-tête) pour te déconnecter et revenir au flux invité.

## 4.2 Visualisation (page d’accueil `/`)

La **Visualisation** affiche une **grille de cages** représentant l’état de la volière.

| Couleur / état (rappel) | Signification |
|-------------------------|---------------|
| Vert | Cage **libre** |
| Rouge | Cage occupée par **un pigeon seul** |
| Orange | Cage occupée par un **couple** |

Actions typiques :

- **Cliquer** sur une case de cage pour ouvrir le **panneau de détail** (informations, raccourcis vers fiches ou actions selon l’implémentation).
- Utiliser les options de **filtre / regroupement** par volière si proposées dans l’interface (codes volière — voir paramètres).

*[Capture : grille visualisation + légende]*

## 4.3 Module Cages (`/cages`)

- **Liste** : tableau ou cartes des cages avec statut, numéro, volière, etc.
- **Nouvelle cage** : `/cages/nouveau` — formulaire (numéro, nom, superficie, description, rattachement volière…).
- **Modifier** : depuis la liste ou les liens contextuels — `/cages/:id/modifier`.

Respect des règles : une cage ne peut pas être **à la fois** occupée par un pigeon seul et un couple (voir `CONCEPTION.md`).

*[Capture : liste cages]*

## 4.4 Module Pigeons (`/pigeons`)

- **Liste** des pigeons avec recherche / filtres selon l’écran.
- **Nouveau pigeon** : `/pigeons/nouveau` — saisie matricule, sexe, race, dates, parents pour généalogie, etc.
- **Fiche pigeon** : `/pigeons/:id` — détail, actions (modifier, santé, généalogie).
- **Santé** : `/pigeons/:id/sante` — historique ou événements de santé (Firestore sous-collection selon règles).
- **Généalogie** : `/pigeons/:id/genealogie` — arbre ou liens de filiation.

Statuts possibles (rappel métier) : ACTIF, VENDU, MORT, PERDU — impact sur les couples et cages.

*[Capture : liste pigeons]*

## 4.5 Module Couples (`/couples`)

- Liste des couples actifs ou historiques selon filtres.
- **Nouveau couple** `/couples/nouveau` : choisir un **mâle** et une **femelle** valides (actifs, pas déjà engagés dans un autre couple actif, etc.).

*[Capture : formulaire couple]*

## 4.6 Module Reproductions (`/reproductions`)

- Liste des portées / événements de reproduction.
- **Nouvelle reproduction** `/reproductions/nouveau` : lien avec un **couple** et saisie des informations de portée (dates, effectifs, jeunes rattachés selon le formulaire).

*[Capture : liste reproductions]*

## 4.7 Module Sorties (`/sorties`)

- Enregistrement des **sorties** de pigeons (vente, perte, autre type selon le formulaire).
- Une sortie met à jour le **statut** du pigeon et peut **libérer** la cage ou **dissoudre** le couple si les règles métier l’imposent.

*[Capture : écran sorties]*

## 4.8 Redirection après connexion / inscription

Comportement par défaut : arrivée sur la **Visualisation** (`/`).

**Retour intelligent** (conservation de l’URL d’origine) uniquement pour certaines routes « profondes » (formulaires ou fiches), par exemple :

- tout chemin sous **`/pigeons/...`** sauf la seule liste `/pigeons` ;
- **`/cages/nouveau`**, **`/cages/:id/modifier`** ;
- **`/couples/nouveau`**, **`/reproductions/nouveau`**.

Détail technique : fichier `apps/web/src/router/postAuthRedirect.js`.

## 4.9 Paramètres — Codes volière

- Zone **paramètres / profil** (selon `UserProfileMenu` et `VoliereCodesPanel`) : gestion des **codes** ou libellés de volières pour regrouper les cages à l’affichage.


---

