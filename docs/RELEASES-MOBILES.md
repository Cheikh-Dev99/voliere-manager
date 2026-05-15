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

### Pas à pas : obtenir **APK + IPA** après un `git push`

Objectif : une fois le code poussé, avoir sur GitHub une **Release** avec `Voliere-Manager-android.apk` et `Voliere-Manager-ios.ipa`.

### Avant la première fois

1. **`EXPO_TOKEN`** en **Repository secret** (voir ci-dessus).
2. **iOS** : au moins un `eas build --profile preview --platform ios` **en local** depuis `apps/mobile/` (compte Apple + certificats enregistrés sur EAS), pour que les builds iOS en CI fonctionnent.
3. Le fichier **`.github/workflows/release-mobile.yml`** doit être présent sur la branche que tu pousses (souvent `main`).

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
4. Attends la fin du job (souvent **20–60 min** : Android puis iOS sur EAS, selon la file).
5. Va dans **Releases** : [releases](https://github.com/cheikh-dev99/voliere-manager/releases) → ouvre la release **`v1.0.3`** → télécharge **APK** et **IPA**.

> **Note** : ce n’est pas un simple `git push` sur une branche sans tag : il faut **`git push origin v1.0.x`** (le tag) pour lancer les deux plateformes automatiquement.

### Méthode alternative — sans tag : lancer à la main

1. `git push` ton code comme d’habitude.
2. **Actions** → **Release mobile (EAS → GitHub Release)** → **Run workflow**.
3. **tag** : ex. `v1.0.3` — **platform** : **`all`**.
4. Même attente, mêmes fichiers sur la release. (Tu peux aussi choisir **`android`** ou **`ios`** seul.)

### Si le build iOS échoue

Relance le workflow avec **platform = `android`** seulement pour livrer l’APK, ou corrige Apple / EAS puis refais un tag ou un run manuel avec **`all`**.

**Rappel** : le job attend la fin des builds EAS (`--wait`), télécharge les artefacts puis exécute `gh release create` / `gh release upload`. iOS exige un compte **Apple Developer** et des certificats sur EAS (voir [expo.dev](https://expo.dev)).

---

## 2. Manuel — machine locale + `gh`

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
