/**
 * Publie uniquement apps/web/dist sur la branche gh-pages (remplacement complet).
 * Évite les résidus (apps/, .yarn) laissés par certaines versions de `gh-pages`.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'apps/web/dist')
const index = path.join(dist, 'index.html')

if (!fs.existsSync(index)) {
  console.error('deploy-github-pages: lancez d’abord `yarn workspace web build`.')
  process.exit(1)
}

const remote = execSync('git remote get-url origin', { cwd: root, encoding: 'utf8' }).trim()
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-gh-pages-'))

for (const name of fs.readdirSync(dist)) {
  fs.cpSync(path.join(dist, name), path.join(tmp, name), { recursive: true })
}

execSync('git init', { cwd: tmp, stdio: 'inherit' })
execSync('git checkout -b gh-pages', { cwd: tmp, stdio: 'inherit' })
execSync('git add -A', { cwd: tmp, stdio: 'inherit' })
execSync('git commit -m "deploy: Volière Manager web"', { cwd: tmp, stdio: 'inherit' })
execSync(`git push -f ${JSON.stringify(remote)} HEAD:gh-pages`, { cwd: tmp, stdio: 'inherit' })

fs.rmSync(tmp, { recursive: true, force: true })
console.log('deploy-github-pages: publié sur gh-pages (dist uniquement).')
