# Projet de validation Web & Mobile

## Synthèse

**Intitulé du projet**  
Conception, réalisation et déploiement d’une application web responsive de gestion d’une volière avec visualisation virtuelle des cages.

---



## 1. OBJECTIF DE L'ÉPREUVE

Cette épreuve vise à évaluer la capacité du candidat à :

- analyser un besoin métier réel dans un domaine spécifique (la colombophilie) ;
- modéliser un système d’information à partir de règles de gestion complexes ;
- développer une application web responsive fonctionnelle, intuitive et responsive ;
- déployer une solution accessible en ligne.

Le candidat devra démontrer sa capacité à concevoir, réaliser et déployer une solution complète, en s’appuyant sur une situation professionnelle concrète.

---



## 2. CONTEXTE PROFESSIONNEL

Thiémokho dit Baay Piteq est un éleveur de pigeons (appelé colombophile) qui gère une volière (bâtiment ou structure abritant les pigeons) contenant plusieurs dizaines de pigeons. Cette activité représente pour Baay Piteq :

- une activité de loisir (élevage pour le plaisir, concours beauté) ;
- une activité sportive (pigeons voyageurs, colombophilie sportive) ;
- une activité commerciale (vente de pigeons reproducteurs ou de compétition).

Avec le développement de son activité, il rencontre plusieurs difficultés :

- difficulté à identifier les pigeons (beaucoup se ressemblent) ;
- mauvaise gestion des couples (mâle/femelle pour la reproduction) ;
- perte d’informations sur les reproductions (qui est fils de qui) ;
- difficulté à savoir quelles cages sont disponibles dans la volière ;
- mauvaise organisation des ventes et pertes.

Actuellement, toutes les informations sont notées sur papier, ce qui entraîne :

- des erreurs de saisie ou de lecture ;
- des oublis ;
- un manque de visibilité globale (impossible de tout consulter rapidement).

Baay Piteq souhaite donc disposer d’une application web responsive permettant de gérer efficacement son élevage et optimiser sa rentabilité.

---



## 3. COMPRÉHENSION APPROFONDIE DU DOMAINE

Cette section est essentielle. Elle explique ce qu’est réellement la gestion d’une volière, avec des exemples concrets. Lisez-la attentivement **avant** de commencer la conception.

### 3.1 Gestion des pigeons : l’unité de base

Un pigeon est un animal vivant, identifié individuellement. Dans l’élevage professionnel ou amateur sérieux, chaque pigeon reçoit un identifiant unique (gravé sur une bague à la patte).

**Exemple** : Pigeon n° P001 : mâle, né le 10/03/2024, race « Boulant de Liège ». Pigeon n° P002 : femelle, née le 15/03/2024, même race.

**Règle métier** : Un pigeon ne peut pas être supprimé physiquement s’il a eu des petits, mais son statut peut passer à « vendu », « mort » ou « perdu ».

### 3.2 Gestion des couples : la base de la reproduction

Dans une volière, l’éleveur forme délibérément des couples pour contrôler la génétique, améliorer les performances des jeunes et planifier les naissances.

**Exemple** : Le mâle P001 et la femelle P002 forment le couple C001 à partir du 01/05/2024.

**Règle métier** : Un pigeon ne peut être en couple qu’avec un pigeon de sexe opposé. Un pigeon ne peut appartenir qu’à un seul couple à la fois.

### 3.3 Gestion des reproductions : la généalogie

Quand un couple donne naissance à des pigeonneaux (généralement 2 par portée), il faut enregistrer : la date de ponte, la date d’éclosion, le nombre de pigeonneaux et leur identifiant une fois bagués.

**Exemple** : Le couple C001 (P001 + P002) produit deux pigeonneaux : P011 (mâle) et P012 (femelle), nés le 10/06/2024.

**Règle métier** : La reproduction permet de retracer l’arbre généalogique. On doit pouvoir, à tout moment, connaître les parents d’un pigeon.

### 3.4 Gestion des sorties : fin de vie dans l’élevage

Un pigeon peut quitter l’effectif actif pour plusieurs raisons :

- **Vente** : cédé à un autre éleveur (avec date et prix). Le pigeon n’est plus dans la volière.
- **Décès** : mort naturelle, maladie ou accident.
- **Perte** : disparition inexpliquée (souvent lors de lâchers pour pigeons voyageurs).

**Exemple** : P011 a été vendu le 15/08/2024 à l’éleveur Dupont pour 150 €.

**Règle métier** : Une fois sorti, le pigeon n’apparaît plus dans les cages libres/occupées, mais son historique reste consultable.

### 3.6 Organisation de la volière et gestion des cages

Une volière est un grand espace divisé en cages ou compartiments. Chaque cage peut contenir un pigeon seul (isolement, quarantaine, repos) ou un couple (mâle + femelle) pour la reproduction.

Pourquoi l’éleveur a-t-il besoin de savoir quelle cage est libre ?

- Pour placer un nouveau pigeon.
- Pour former un nouveau couple.
- Pour isoler un pigeon malade.
- Pour préparer les naissances.

**Exemple** : La volière a 20 cages (Cage01 à Cage20). Cage01 : libre. Cage02 : occupée par P001 (seul, en quarantaine). Cage03 : occupée par le couple C001 (P001 + P002).

**Règle métier** : Une cage ne peut contenir qu’un seul pigeon ou un seul couple. Une cage libre ne contient aucun pigeon.

### 3.7 Visualisation virtuelle : l’interface indispensable

L’éleveur ne veut pas une simple liste de cages : il veut voir sa volière. Le principe est similaire à la réservation de places dans un cinéma, un bus ou un avion.


| Élément réel               | Analogie dans l’application           |
| -------------------------- | ------------------------------------- |
| Cages                      | Sièges / places                       |
| Pigeons                    | Passagers                             |
| Cage libre                 | Siège libre (vert)                    |
| Cage occupée par un pigeon | Siège occupé (rouge)                  |
| Cage avec un couple        | Siège occupé par 2 passagers (orange) |


L’utilisateur doit pouvoir cliquer sur une cage pour :

- voir son contenu (pigeon/couple, historique) ;
- affecter un pigeon ou un couple ;
- libérer la cage.

---

## 4. GLOSSAIRE MÉTIER


| Terme                   | Définition                                                                |
| ----------------------- | ------------------------------------------------------------------------- |
| **Colombophile**        | Éleveur de pigeons.                                                       |
| **Volière**             | Structure abritant plusieurs cages à pigeons.                             |
| **Cage / compartiment** | Espace individuel destiné à un pigeon seul ou à un couple.                |
| **Bague**               | Anneau à la patte du pigeon contenant son identifiant unique.             |
| **Pigeonneau**          | Jeune pigeon (avant 6 mois).                                              |
| **Portée**              | Ensemble des petits nés d’un même couple en une fois (souvent 2).         |
| **Sortie**              | Événement qui retire le pigeon de l’effectif actif (vente, décès, perte). |


---



## 5. TRAVAIL DEMANDÉ

### 5.1 Phase de conception

Le candidat devra :

- analyser le besoin à l’aide des explications ci-dessus ;
- identifier les entités (Pigeon, Couple, Reproduction, Cage, Sortie, Utilisateur) ;
- définir les relations (Un couple a deux pigeons, Une cage contient 0 ou 1 pigeon ou 1 couple, etc.) ;
- produire un **MCD** (Modèle Conceptuel de Données) ;
- proposer une **architecture technique** (frontend, backend, base de données).

### 5.2 Phase de réalisation {#phase-realisation}

L’application doit inclure impérativement les modules suivants :

**Gestion des pigeons (CRUD)**  
Ajouter, modifier, supprimer logiquement (soft delete), consulter.

**Gestion des couples**  
Créer un couple (sélectionner un mâle et une femelle disponibles). Consulter la liste des couples actifs. Rompre un couple.

**Gestion des reproductions**  
Enregistrer une reproduction (quel couple, date, nombre de jeunes). Enregistrer les jeunes pigeons nés (création automatique ou manuelle). Consulter l’arbre généalogique (parents/enfants).

**Gestion des sorties**  
Vendre un pigeon (date, prix, acheteur). Déclarer un décès (date, cause probable). Déclarer une perte (date, circonstance).

**Gestion des cages**  
Créer, modifier et supprimer des cages (numéro, nom, superficie, etc.).

#### VISUALISATION VIRTUELLE DE LA VOLIÈRE — FONCTIONNALITÉ CENTRALE DE L'ÉVALUATION

L’interface de visualisation doit permettre :

- l’affichage des cages sous forme de **grille** ;
- une distinction visuelle immédiate : cage libre (**vert**), cage occupée par un pigeon seul (**rouge**, avec affichage de l’identifiant au survol), cage occupée par un couple (**orange**, avec affichage des deux identifiants) ;
- une action au **clic** sur une cage :  
  - si **libre** → affecter un pigeon ou un couple ;  
  - si **occupée** → voir le détail (pigeon/couple, historique médical, reproduction) et possibilité de **libérer** ;
- un **rafraîchissement dynamique** (sans rechargement complet de la page si possible).

**Authentification**  
Connexion sécurisée. Au moins un compte utilisateur.

**Interface**  
Application **Web responsive** (parcours Web) ou **Application Mobile** (parcours Mobile). Navigation intuitive (l’utilisateur sait toujours où il se trouve).

### 5.3 Phase de déploiement

Le candidat devra :

- déployer l’application sur un **serveur accessible** si la formation était orientée **web** ;
- mettre à disposition de l’**APK** si la formation était orientée **mobile** ;
- fournir une **URL** ou un **APK** fonctionnel ;
- vérifier le fonctionnement sur **mobile** et **desktop**.

---



## 6. CONTRAINTES TECHNIQUES

- Architecture **client / serveur** ;
- **Base de données obligatoire** ;
- **API recommandée** pour la visualisation dynamique ;
- Le choix de la technologie est libre : Laravel, Django, Node.js ou **Firebase** — **Firebase est fortement recommandé** afin d’optimiser la charge de travail ;
- Application **accessible en ligne** durant toute la période de correction.

---



## 7. LIVRABLES

1. **Cahier des charges** (3 pages maximum) : objectifs, règles métier, fonctionnalités.
2. **Code source complet** déposé sur GitHub / GitLab avec un **README** clair.
3. **Application déployée** ou **APK / IPA** mis à disposition — livrables : [**GitHub Releases**](https://github.com/cheikh-dev99/voliere-manager/releases/latest) (voir [Releases mobiles](./RELEASES-MOBILES.md) et le [README](../README.md)).
4. **Présentation orale** : 5 min de démo + 5 min de questions.

---



## 8. CONSIGNES AUX CANDIDATS

Ce document contient toutes les explications métier dont vous avez besoin pour comprendre le domaine. Si un terme n’est pas clair, référez-vous au glossaire (section 4).

Vous devez prioriser dans cet ordre :

1. La **logique métier** (ce que l’éleveur fait vraiment chaque jour).
2. La **structuration des données** (MCD propre).
3. Le fonctionnement de la **visualisation des cages** (élément différenciant).
4. La **cohérence générale** (un pigeon vendu n’a plus de cage).

Une solution simple mais entièrement fonctionnelle est préférable à une solution complexe mais incomplète.

---

