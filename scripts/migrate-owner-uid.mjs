/**
 * Renseigne ownerUid sur les documents existants (avant cloisonnement multi-comptes).
 *
 * Usage (bash) :
 *   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json
 *   node scripts/migrate-owner-uid.mjs <UID_FIREBASE_DU_PREMIER_COMPTE>
 *
 * L’UID se trouve dans Firebase Console → Authentication → onglet Utilisateurs → colonne UID.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import admin from 'firebase-admin'

const ownerUid = process.argv[2]?.trim()
if (!ownerUid) {
  console.error('Usage : node scripts/migrate-owner-uid.mjs <UID_FIREBASE>')
  process.exit(1)
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credPath || !existsSync(resolve(credPath))) {
  console.error(
    'Définis GOOGLE_APPLICATION_CREDENTIALS vers le fichier JSON du compte de service Firebase.',
  )
  process.exit(1)
}

const sa = JSON.parse(readFileSync(resolve(credPath), 'utf8'))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
  })
}

const db = admin.firestore()

const COLLECTIONS = ['pigeons', 'cages', 'couples', 'sorties', 'reproductions']

async function migrateCollection(name) {
  const snap = await db.collection(name).get()
  let updated = 0
  let batch = db.batch()
  let ops = 0

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    if (data.ownerUid != null && data.ownerUid !== '') continue

    batch.update(docSnap.ref, { ownerUid })
    ops++
    updated++

    if (ops >= 450) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }

  if (ops > 0) await batch.commit()
  console.log(`[${name}] documents mis à jour : ${updated}`)
}

async function main() {
  for (const c of COLLECTIONS) {
    await migrateCollection(c)
  }
  console.log('Terminé. Déploie les règles Firestore mises à jour si ce n’est pas déjà fait.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
