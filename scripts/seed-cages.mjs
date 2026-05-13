/**
 * Seed Firestore : cages A02 … A20 (Volière A, LIBRE).
 * La cage A01 peut rester celle créée manuellement (ID auto).
 *
 * Prérequis :
 * 1. Console Firebase → Paramètres du projet → Comptes de service → Générer une nouvelle clé privée (JSON).
 * 2. Ne jamais committer ce fichier.
 * 3. PowerShell :
 *    $env:GOOGLE_APPLICATION_CREDENTIALS="C:\chemin\vers\serviceAccountKey.json"
 *    npm run seed:cages -- <UID_FIREBASE_AUTH>
 *
 * Bash :
 *    export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccountKey.json
 *    npm run seed:cages -- <UID_FIREBASE_AUTH>
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import admin from 'firebase-admin'

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

const ownerUid = process.argv[2]?.trim()
if (!ownerUid) {
  console.error('Usage : npm run seed:cages -- <UID_FIREBASE> (même UID que pour migrate:owner-uid).')
  process.exit(1)
}

const VOLIERE = 'A'
const SUPERFICIE = 0.5
const DESCRIPTION = 'Cage volière A'

async function main() {
  const batch = db.batch()
  let count = 0

  for (let n = 2; n <= 20; n += 1) {
    const numero = `A${String(n).padStart(2, '0')}`
    const docId = `cage_${numero}`
    const ref = db.collection('cages').doc(docId)

    const snap = await ref.get()
    if (snap.exists) {
      console.log(`Existe déjà : ${docId} (skip)`)
      continue
    }

    batch.set(ref, {
      ownerUid,
      numero,
      nom: `Cage ${numero}`,
      superficie: SUPERFICIE,
      description: DESCRIPTION,
      voliereCode: VOLIERE,
      statut: 'LIBRE',
      pigeonId: null,
      coupleId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    count += 1
  }

  if (count === 0) {
    console.log('Aucun document à créer (tous présents).')
    return
  }

  await batch.commit()
  console.log(`OK : ${count} cage(s) créée(s) (A02–A20, IDs cage_A02 … cage_A20).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
