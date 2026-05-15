/**
 * Après `vite build` : copie index → 404.html (routes SPA sur GitHub Pages).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/dist')
const index = path.join(dist, 'index.html')

if (!fs.existsSync(index)) {
  console.error('pages-postbuild: apps/web/dist/index.html introuvable — lancez yarn build dans apps/web.')
  process.exit(1)
}

fs.copyFileSync(index, path.join(dist, '404.html'))
console.log('pages-postbuild: 404.html créé (copie de index.html)')
