# Releases mobiles (GitHub) — APK / IPA sans fichier à la racine

Les binaires **ne sont plus versionnés** à la racine du monorepo. Ils sont publiés en **GitHub Releases** (assets téléchargeables), aligné avec les bonnes pratiques Git (pas de gros binaires dans l’historique).

**Dépôt des releases** : [github.com/cheikh-dev99/voliere-manager/releases](https://github.com/cheikh-dev99/voliere-manager/releases)  
*(Si l’URL du dépôt change, adapte ce lien dans la doc et le README.)*

---

## 1. Automatique — GitHub Actions

### Secrets à configurer

| Secret | Où le créer |
| --- | --- |
| `EXPO_TOKEN` | [expo.dev → Access tokens](https://expo.dev/accounts/_/settings/access-tokens) (compte propriétaire du projet EAS) |

**Réglages dépôt GitHub** : `Settings` → `Secrets and variables` → `Actions` → onglet **Repository secrets** (pas seulement *Environment*) → `New repository secret` → nom **`EXPO_TOKEN`**.

---

### Pas à pas : obtenir l’**APK Android** (et l’**IPA iOS** seulement si tu as Apple)

Objectif : après un **`git push` du tag** `v…`, une **Release** GitHub avec au minimum **`Voliere-Manager-android.apk`**. Le fichier **`Voliere-Manager-ios.ipa`** n’apparaît **que** si un build iOS a réussi (compte **Apple Developer** + certificats sur EAS).

### Sans compte Apple

- Tu peux **livrer et tester sur Android** sans rien côté Apple.
- Un **IPA installable sur iPhone** via EAS (profil `preview` device) **exige** un compte Apple / équipe de développement (gratuit ou payant selon le cas) pour signer l’app. **Sans ça, pas d’IPA « store-like » réaliste.**
- Le workflow déclenché par **`git push origin v1.0.x`** ne build plus que **Android** (évite un job rouge à cause d’iOS).
- Pour tenter iOS quand tu auras un compte : **Actions** → **Run workflow** → **platform** = **`all`** (l’étape iOS peut échouer sans bloquer la publication de l’APK).

### Avant la première fois

1. **`EXPO_TOKEN`** en **Repository secret** (voir ci-dessus). Le même secret dans l’environnement **github-pages** ne sert **pas** à ce workflow ; ce qui compte est la ligne **Repository secrets** → `EXPO_TOKEN`.
2. *(Optionnel iOS)* Un `eas build --profile preview --platform ios` **en local** une fois que tu as un compte Apple, pour enregistrer les certificats sur EAS.
3. Le fichier **`.github/workflows/release-mobile.yml`** doit être sur **`main`** avant de pousser le tag.

### Méthode recommandée — push d’un **tag** `v…`

1. Commit ton travail sur `main` (ou ta branche de référence) et pousse le code :
   ```bash
   git add -A && git commit -m "chore: préparation release mobile"   # si besoin
   git push origin main
   ```
2. Crée un **tag** de version (ex. `v1.0.3`) **sur le commit** qui doit être buildé, puis pousse **le tag** :
   ```bash
   git tag v1.0.3
   git push origin v1.0.3
   ```
3. Sur GitHub : **Actions** → le workflow **Release mobile (EAS → GitHub Release)** doit **démarrer tout seul** (déclenché par le tag `v*`).
4. Attends la fin du job (souvent **~15–40 min** pour l’APK Android sur EAS).
5. Va dans **Releases** : [releases](https://github.com/cheikh-dev99/voliere-manager/releases) → ouvre la release **`v1.0.3`** → télécharge **`Voliere-Manager-android.apk`**.

> **Tag `v*`** : déclenche **Android uniquement**. Pour **Android + iOS** : lance le workflow à la main avec **platform = `all`** (compte Apple requis pour iOS).

> **Note** : un simple `git push` sur `main` **sans** tag ne lance pas ce workflow.

### Méthode alternative — sans tag : lancer à la main

1. `git push` ton code comme d’habitude.
2. **Actions** → **Release mobile (EAS → GitHub Release)** → **Run workflow**.
3. **tag** : ex. `v1.0.3` — **platform** : **`all`**.
4. Même attente, mêmes fichiers sur la release. (Tu peux aussi choisir **`android`** ou **`ios`** seul.)

### Si le build iOS échoue (manuel avec **all**)

L’**APK** est quand même publié si Android a réussi. Corrige Apple / EAS puis relance avec **`all`**, ou utilise **`ios`** seul pour retester iOS.

**Dépannage** : si `eas build:download` en CI affiche *« EAS project not configured »*, c’est en général qu’il a été lancé **hors** du dossier `apps/mobile/` — le workflow du dépôt doit exécuter cette commande **depuis `apps/mobile`** (là où se trouvent `app.json` / `eas.json`).

---

Depuis `apps/mobile/` (secrets EAS déjà créés, voir [§ 5.2 Installation](./INSTALLATION-ET-CONFIGURATION.md#build-apk-eas)) :

```bash
cd apps/mobile
eas login
# Android
eas build --profile preview --platform android --wait
# Noter le BUILD_ID affiché, ou depuis https://expo.dev
eas build:download --build-id BUILD_ID
# Le .apk est dans le répertoire courant ; renommer / déplacer si besoin :
# mv *.apk ../../artifacts/Voliere-Manager-android.apk

# iOS (si compte Apple / certificats OK sur EAS)
# eas build --profile preview --platform ios --wait
# eas build:download --build-id BUILD_ID_IOS
# mv *.ipa ../../artifacts/Voliere-Manager-ios.ipa
```

Publier sur GitHub (CLI [`gh`](https://cli.github.com/)) :

```bash
cd ../..   # racine du monorepo
export TAG=v1.0.2
gh release create "$TAG" artifacts/Voliere-Manager-android.apk \
  --title "Mobile $TAG" --notes "Build EAS preview — Android"
# Avec IPA en plus :
gh release create "$TAG" artifacts/Voliere-Manager-android.apk artifacts/Voliere-Manager-ios.ipa \
  --title "Mobile $TAG" --generate-notes
```

Pour **ajouter** un fichier à une release existante :

```bash
gh release upload "$TAG" artifacts/Voliere-Manager-android.apk --clobber
```

---

## 3. Retirer l’APK versionné à la racine (migration Git)

Si l’historique contenait `Volière Manager.apk` à la racine :

```bash
git rm --cached "Volière Manager.apk"
```

Le fichier peut rester sur le disque ; il est ignoré via `.gitignore` (`*.apk`, etc.). Ensuite commit : *« chore: stop tracking APK — use GitHub Releases »*.

---

## 4. Profils EAS

Voir `apps/mobile/eas.json` :

- **`preview`** : APK Android (distribution interne) ; iOS en build « device » si credentials OK.
- **`production`** : AAB Android pour Play Store (hors sujet de cette page).

---

## 5. Lien « dernière release » pour le jury / README

- Dernière release : `https://github.com/cheikh-dev99/voliere-manager/releases/latest`
- Liste : `https://github.com/cheikh-dev99/voliere-manager/releases`
