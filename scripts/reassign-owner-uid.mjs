/**
 * Réattribue tous les documents dont ownerUid = ancien compte vers le nouvel UID.
 * À utiliser quand tu te reconnectes avec le « bon » email mais que les données
 * ont été créées sous un autre UID Firebase (ex. ancien compte supprimé / autre auth).
 *
 * Usage :
 *   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/serviceAccountKey.json
 *   node scripts/reassign-owner-uid.mjs <ANCIEN_UID> <NOUVEL_UID>
 *
 * Exemple (données créées sous 81Gni…, compte actuel gnWI6…) :
 *   node scripts/reassign-owner-uid.mjs 81Gni8dR1ESPOOVeg3mXZinCsO53 gnWI6OmNKIS8qYvKMQygiXK4Ov52
 *
 * Sécurité : réservé à un projet perso / démo — à manipuler avec précaution.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import admin from 'firebase-admin'

const fromUid = process.argv[2]?.trim()
const toUid = process.argv[3]?.trim()

if (!fromUid || !toUid) {
  console.error('Usage : node scripts/reassign-owner-uid.mjs <ANCIEN_UID> <NOUVEL_UID>')
  process.exit(1)
}

if (fromUid === toUid) {
  console.error('Les deux UID doivent être différents.')
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

const ROOT_COLLECTIONS = ['pigeons', 'cages', 'couples', 'sorties', 'reproductions']

async function reassignCollection(name) {
  const snap = await db.collection(name).where('ownerUid', '==', fromUid).get()
  let updated = 0
  let batch = db.batch()
  let ops = 0

  for (const docSnap of snap.docs) {
    batch.update(docSnap.ref, { ownerUid: toUid })
    ops++
    updated++

    if (ops >= 450) {
      await batch.commit()
      batch = db.batch()
      ops = 0
    }
  }

  if (ops > 0) await batch.commit()
  console.log(`[${name}] documents réattribués : ${updated}`)
}

/** Sous-collection santé : même propriétaire que le pigeon parent. */
async function reassignPigeonHealthEvents() {
  const pigeonsSnap = await db.collection('pigeons').where('ownerUid', '==', toUid).get()
  let updated = 0
  for (const pigeonDoc of pigeonsSnap.docs) {
    const sub = await pigeonDoc.ref.collection('evenements_sante').where('ownerUid', '==', fromUid).get()
    let batch = db.batch()
    let ops = 0
    for (const ev of sub.docs) {
      batch.update(ev.ref, { ownerUid: toUid })
      ops++
      updated++
      if (ops >= 450) {
        await batch.commit()
        batch = db.batch()
        ops = 0
      }
    }
    if (ops > 0) await batch.commit()
  }
  console.log(`[pigeons/*/evenements_sante] entrées réattribuées : ${updated}`)
}

async function main() {
  console.log(`Réattribution ownerUid : ${fromUid} → ${toUid}`)
  for (const c of ROOT_COLLECTIONS) {
    await reassignCollection(c)
  }
  await reassignPigeonHealthEvents()
  console.log('Terminé.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
