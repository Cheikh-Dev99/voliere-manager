import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const require = createRequire(import.meta.url)
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Workspaces npm : react peut être hoisté à la racine du monorepo sans lien dans apps/web — Vite 8 sinon ENOENT sur react-dom/index.js */
const reactRoot = path.dirname(require.resolve('react/package.json'))
const reactDomRoot = path.dirname(require.resolve('react-dom/package.json'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  /** Inlining pour `packages/shared/firebase/config.ts` (pas d’`import.meta` côté partagé / Hermes). */
  const firebaseDefine = {
    'process.env.EXPO_PUBLIC_FIREBASE_API_KEY': JSON.stringify(
      env.VITE_FIREBASE_API_KEY ?? env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    ),
    'process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(
      env.VITE_FIREBASE_AUTH_DOMAIN ?? env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    ),
    'process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID': JSON.stringify(
      env.VITE_FIREBASE_PROJECT_ID ?? env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    ),
    'process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': JSON.stringify(
      env.VITE_FIREBASE_STORAGE_BUCKET ?? env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    ),
    'process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
      env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    ),
    'process.env.EXPO_PUBLIC_FIREBASE_APP_ID': JSON.stringify(
      env.VITE_FIREBASE_APP_ID ?? env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    ),
    'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY ?? ''),
    'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
    'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID ?? ''),
    'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET ?? ''),
    'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(
      env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    ),
    'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID ?? ''),
  }

  /** GitHub Pages : ex. `VITE_BASE=/voliere-manager/` dans `.env.production` (slash initial obligatoire, slash final recommandé). */
  const rawBase = (env.VITE_BASE ?? '').trim()
  const base =
    !rawBase || rawBase === '/'
      ? '/'
      : `${rawBase.startsWith('/') ? '' : '/'}${rawBase.replace(/\/+$/, '')}/`

  return {
  base,
  plugins: [
    tailwindcss(),
    react(),
  ],
  define: firebaseDefine,
  resolve: {
    alias: {
      '@shared'            : path.resolve(__dirname, '../../packages/shared'),
      react                : reactRoot,
      'react-dom'          : reactDomRoot,
      'react/jsx-runtime'  : require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
      'firebase/app'       : require.resolve('firebase/app'),
      'firebase/firestore' : require.resolve('firebase/firestore'),
      'firebase/auth'      : require.resolve('firebase/auth'),
      'firebase/storage'   : require.resolve('firebase/storage'),
      zod                  : require.resolve('zod'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react-colorful'],
  },
  }
})
