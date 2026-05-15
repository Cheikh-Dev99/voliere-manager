# Sécurité, règles Firestore et déploiement

**Documents liés** : [Installation](./INSTALLATION-ET-CONFIGURATION.md) · [Déploiement](./DEPLOYEMENT-DEMO-ET-PROD.md)

## 1. Modèle de confiance

- **Authentification** : Firebase Auth (identité utilisateur = `request.auth.uid`).
- **Autorisation** : règles **Firestore** qui n’autorisent l’accès qu’aux documents portant le même **`ownerUid`** que l’utilisateur connecté (sauf cas documentés, ex. lecture profil utilisateur selon règles `users/{userId}`).
- **Client web** : ne fait pas confiance à l’UI pour la sécurité ; les règles serveur sont la **source de vérité** pour lecture / écriture.

## 2. Principes des règles (`firebase/firestore.rules`)

Extraits du modèle (voir fichier complet dans le dépôt) :

- Fonctions **`signedIn()`**, **`owns()`**, **`ownsOnCreate()`**, **`ownsAfterUpdate()`** pour garantir que `ownerUid` correspond à l’utilisateur et reste **inchangé** après création.
- Collections **`cages`**, **`pigeons`**, **`couples`**, **`reproductions`**, **`sorties`** : accès conditionné à la propriété du document.
- **Sous-collections** (ex. `evenements_sante` sous `pigeons`) : accès réservé au propriétaire du pigeon parent.

Toute tentative d’accès à un document d’un autre utilisateur est **rejetée** par Firestore.

## 3. Secrets et fichiers sensibles

Ne jamais committer :

- **`apps/web/.env.local`** (clés Firebase web — exposées au navigateur mais liées à des restrictions de domaine et règles Firestore).
- **`apps/mobile/.env.local`** (variables `EXPO_PUBLIC_FIREBASE_*` pour Expo) : ne pas committer ; les fichiers `.env*.local` sont exclus par **`.gitignore`** (les `.env.example` restent versionnés).
- **Comptes de service** `*-firebase-adminsdk*.json`, `serviceAccount*.json` (scripts admin).
- **Keystores** Android / certificats iOS pour publication mobile.

Référence : **`.gitignore`** à la racine `voliere-manager`.

## 4. Déploiement des règles

Depuis la machine avec Firebase CLI configurée sur le bon projet :

```bash
cd voliere-manager
firebase deploy --only firestore:rules
```

Le fichier **`firebase.json`** à la racine du monorepo pointe vers `firebase/firestore.rules` et `firebase/firestore.indexes.json`. Pour **Storage** :

```bash
firebase deploy --only storage
```

Les photos pigeons (`pigeons/{userId}/…`) ne sont lisibles et modifiables que par l’utilisateur authentifié dont l’`uid` correspond à `{userId}` (`firebase/storage.rules`).

## 5. Déploiement du front web

1. **`yarn build`** dans `apps/web` → artefacts dans **`dist/`**.
2. Héberger les fichiers statiques (Firebase Hosting, etc.).
3. Configurer les **réécritures SPA** : toutes les routes non fichiers → `index.html` pour que React Router gère `/pigeons`, `/cages/...`, etc.
4. Ajouter l’**URL de production** aux domaines autorisés Firebase (Auth + éventuellement Storage CORS si utilisé).

## 6. Données existantes sans `ownerUid`

Les règles supposent **`ownerUid`** sur les documents métier. Pour des données historiques, utiliser les scripts documentés en racine (ex. `migrate:owner-uid`) — voir commentaires en tête de `firestore.rules`.

## 7. Bonnes pratiques avant mise en production

- Vérifier les **règles Firestore** en simulateur ou sur environnement de staging.
- Activer la **facturation** uniquement si nécessaire (Blaze pour certaines fonctions Storage / outbound).
- Surveiller les **quotas** et l’usage Authentication.
- Prévoir une **politique de sauvegarde** / export Firestore selon les besoins légaux ou associatifs.

---

