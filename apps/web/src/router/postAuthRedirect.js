/**
 * Cible après connexion / inscription : Visualisation par défaut,
 * restauration de l’URL uniquement pour les parcours où perdre le contexte est gênant
 * (fiches pigeon, formulaires cage / couple / reproduction).
 */
export const POST_AUTH_DEFAULT = '/'

const SMART_PATH_PATTERNS = [
  /^\/pigeons\/.+$/, // nouveau, fiche, modifier, santé, généalogie (pas la liste seule /pigeons)
  /^\/cages\/nouveau$/,
  /^\/cages\/[^/]+\/modifier$/,
  /^\/couples\/nouveau$/,
  /^\/reproductions\/nouveau$/,
]

/**
 * @param {string | undefined} fromPathname - ex. `location.state?.from?.pathname`
 * @returns {string} chemin interne sûr (commence par `/`, pas d’open redirect évident)
 */
export function resolvePostAuthPath(fromPathname) {
  if (typeof fromPathname !== 'string') return POST_AUTH_DEFAULT
  const p = fromPathname.trim()
  if (!p.startsWith('/') || p.startsWith('//') || p.includes('..')) return POST_AUTH_DEFAULT
  if (p === '/login') return POST_AUTH_DEFAULT

  if (SMART_PATH_PATTERNS.some((re) => re.test(p))) return p
  return POST_AUTH_DEFAULT
}
