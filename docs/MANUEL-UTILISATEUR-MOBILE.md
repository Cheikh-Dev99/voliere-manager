# Manuel utilisateur — Mobile

> **Alignement cahier de charge** : ce manuel décrit les **parcours utilisateur** de l’app **Expo** (React Native), en parallèle du [Manuel utilisateur — Web](./MANUEL-UTILISATEUR-WEB.md). Les exigences fonctionnelles de référence restent en [§ 5.2 Phase de réalisation](./CAHIER-DE-CHARGE.md#phase-realisation) du [Cahier des charges](./CAHIER-DE-CHARGE.md).

Après connexion, la navigation principale repose sur **six onglets** en bas d’écran (Volière, Cages, Pigeons, Couples, Reproductions, Sorties). Les **fiches** et **formulaires** s’ouvrent en pile au-dessus des onglets.

Stack technique, dossiers `app/` et variables d’environnement : [Architecture technique — Mobile](./ARCHITECTURE-MOBILE.md).

## 1. Première visite — Connexion et inscription

### 1.1 Accès à l’authentification

- **APK Android** : télécharger le fichier **`.apk`** depuis la [**dernière release GitHub**](https://github.com/cheikh-dev99/voliere-manager/releases/latest), l’installer sur un téléphone Android (autoriser les sources inconnues si demandé), puis ouvrir l’application **Volière Manager**. Voir [Releases mobiles](./RELEASES-MOBILES.md) pour régénérer ou publier une build.
- **Développement** : lancer l’app avec Expo Go ou `yarn start` dans `apps/mobile/`.
- Si tu n’es pas connecté, l’écran **`(auth)/login`** s’affiche.

### 1.2 Connexion

1. Onglet **Connexion**.
2. Saisir **e-mail** et **mot de passe**.
3. Valider : en cas de succès, tu arrives sur la zone authentifiée (onglets), en pratique souvent l’onglet **Cages** ou **Volière** selon la configuration de navigation.
4. En cas d’erreur, un message d’erreur s’affiche.

*[Capture : écran Connexion]*

### 1.3 Création de compte (inscription)

1. Onglet **Inscription**.
2. Renseigner **prénom**, **nom**, **e-mail**, **mot de passe** et **confirmation**.
3. Optionnel : **nom de la volière**.
4. Après validation, session ouverte ; accès aux onglets.

*[Capture : onglet Inscription]*

### 1.4 Mot de passe oublié

1. Onglet ou lien **Mot de passe oublié**.
2. Saisir l’**e-mail** du compte.
3. E-mail Firebase de réinitialisation (domaines autorisés configurés dans la console Firebase).

*[Capture : mot de passe oublié]*

### 1.5 Déconnexion

- Menu utilisateur en **en-tête** (icône / avatar) : **Déconnexion** pour revenir à l’écran de login.

## 2. Visualisation (onglet Volière)

- Grille des **cages** avec les mêmes codes couleur que sur le web : vert (libre), rouge (pigeon seul), orange (couple).
- **Toucher** une case pour ouvrir la **fiche cage** (pile).
- Arrière-plan type **filigrane** sur cet onglet (comme sur les cinq autres listes principales).

*[Capture : grille Volière]*

## 3. Module Cages (onglet Cages)

- **Liste** des cages (cartes ou lignes selon l’écran).
- **Nouvelle cage** : parcours dédié (`cage/nouveau`).
- **Fiche cage** : `cage/[cageId]` — détail, accès édition, historique.
- **Modifier** : `cage/edit/[cageId]`.
- **Historique** : `cage/[cageId]/historique`.

Une cage ne peut pas être à la fois occupée par un pigeon seul et un couple (voir [Conception](./CONCEPTION.md)).

*[Capture : liste cages]*

## 4. Module Pigeons (onglet Pigeons)

- **Liste** avec recherche / filtres (dont statut, ex. archivés).
- **Exporter CSV (affichage)** : exporte les **lignes actuellement affichées** ; le fichier est proposé via le **partage** système (aligné sur le web via `@shared/utils/pigeonCsv`).
- **Archiver** : action sur la carte (pigeon non archivé), selon les libellés de l’interface.
- **Nouveau pigeon** : bouton **+** (flottant ou en-tête selon l’écran) — `pigeon/nouveau`.
- **Fiche pigeon** : toucher une carte — `pigeon/[pigeonId]` (modifier, santé, généalogie depuis la fiche ou la pile).

Statuts pigeon (rappel) : ACTIF, VENDU, MORT, PERDU — impact couples et cages.

*[Capture : liste pigeons + export]*

## 5. Module Couples (onglet Couples)

- Liste avec **puces de filtre** : **Actifs** par défaut (couples en cours, non rompus), possibilité **Tous** ou **Rompus**.
- **Nouveau couple** : `couple/nouveau` — choix d’un **mâle** et d’une **femelle** valides ; les sélecteurs métier ne proposent en principe que des couples **actifs** pour les actions en cours.

*[Capture : liste couples + filtres]*

## 6. Module Reproductions (onglet Repro.)

- Liste des portées.
- **Nouvelle reproduction** : `reproduction/nouveau` — lien avec un **couple** et saisie des informations de portée.

*[Capture : liste reproductions]*

## 7. Module Sorties (onglet Sorties)

- Liste des sorties ; **nouvelle sortie** : `sortie/nouveau`.
- Une sortie met à jour le **statut** du pigeon et peut **libérer** la cage ou **rompre** le couple selon les règles métier.

*[Capture : sorties]*

## 8. Profil et paramètres

- **Apparence** : thème **clair** par défaut au premier lancement. Dans le **profil** ou l’en-tête, basculer entre **Clair**, **Système** (suit le téléphone) et **Sombre**.
- Depuis le **menu en-tête** : accès au **profil** (feuille ou écran dédié) : informations compte, **statistiques** d’élevage, **codes volière** pour regrouper l’affichage des cages, cohérent avec le web (`UserProfileMenu` / profil complet côté web).

*[Capture : menu profil]*

## 9. Navigation « profonde »

Les routes sous **`pigeon/`**, **`couple/`**, **`reproduction/`**, **`sortie/`**, **`cage/`** s’empilent avec un **en-tête retour** ; elles n’affichent en général **pas** le filigrane des six onglets listes, pour une lecture plus confortable des formulaires et fiches.

---
