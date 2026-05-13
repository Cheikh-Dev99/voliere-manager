/**
 * Supprime le dossier @rolldown du web (binaire .node souvent verrouillé sous Windows),
 * ce qui débloque `yarn install` quand Vite / un antivirus garde le fichier ouvert.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'apps', 'web', 'node_modules', '@rolldown');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(target)) {
    console.log('OK — rien à supprimer :', target);
    return;
  }
  for (let i = 0; i < 8; i++) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log('OK — supprimé :', target);
      return;
    } catch (e) {
      const code = /** @type {NodeJS.ErrnoException} */ (e).code;
      if (code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY') {
        console.warn(
          `Tentative ${i + 1}/8 — encore verrouillé (${code}). Ferme le serveur Vite (yarn workspace web dev), Metro/Expo, puis réessaie.`,
        );
        await sleep(1500);
        continue;
      }
      throw e;
    }
  }
  console.error(
    'Impossible de supprimer @rolldown. Ferme tous les terminaux qui tournent sur ce projet, ou redémarre la machine, puis : yarn unlink:rolldown && yarn',
  );
  process.exit(1);
}

await main();
