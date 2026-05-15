/**
 * Tokens motion + élévation (web) — alignés sur l’app mobile (ombres / press / transitions).
 * @see apps/web/src/index.css (keyframes vm-*)
 */

/** Durées & courbes (utilisées aussi en CSS custom properties). */
export const vmDurationFast = 'duration-150'
export const vmDurationBase = 'duration-200'
export const vmDurationSlow = 'duration-300'

export const vmEaseOut = 'ease-out'

/** Transitions courantes */
export const vmTransitionColors = `transition-colors ${vmDurationBase} ${vmEaseOut}`

export const vmTransitionInteractive = `transition-[color,background-color,box-shadow,transform,opacity] ${vmDurationBase} ${vmEaseOut}`

/** Feedback tactile léger (boutons, cartes cliquables) */
export const vmPressable =
  `active:scale-[0.98] ${vmTransitionInteractive} motion-reduce:transition-none motion-reduce:active:scale-100`

/** Élévation 1 — cartes filtres, formulaires, segments */
export const vmElevation1 =
  'shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] dark:shadow-black/30 dark:ring-white/[0.06]'

/** Élévation 2 — tableaux, listes structurées */
export const vmElevation2 =
  'shadow-md shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.05] dark:shadow-black/35 dark:ring-white/[0.06]'

/** Élévation 3 — menus, tooltips, combobox */
export const vmElevation3 =
  'shadow-lg shadow-slate-900/10 dark:shadow-black/45'

/** Élévation 4 — modales, panneaux latéraux */
export const vmElevation4 =
  'shadow-xl shadow-slate-900/12 dark:shadow-black/55'

/** Chrome fixe (header, bottom nav) */
export const vmChromeHeader =
  'shadow-[0_1px_0_rgba(15,23,42,0.05)] dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]'

export const vmChromeBottomNav =
  'shadow-[0_-8px_28px_rgba(15,23,42,0.08)] dark:shadow-[0_-8px_28px_rgba(0,0,0,0.45)]'

/** Carte interactive (liste pigeons, etc.) */
export const vmInteractiveCard = `${vmElevation1} ${vmTransitionInteractive} hover:shadow-md hover:-translate-y-px motion-reduce:hover:translate-y-0`

/** Nav desktop active / inactive */
export const vmNavInactive = `${vmTransitionColors} text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800/90 dark:hover:text-slate-50 dark:focus-visible:ring-offset-slate-900`

export const vmNavActive = `${vmTransitionInteractive} scale-[1.02] bg-teal-100 text-teal-900 ${vmElevation1} ring-teal-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 dark:bg-teal-900/50 dark:text-teal-50 dark:ring-teal-600/40 dark:focus-visible:ring-offset-slate-900 motion-reduce:scale-100`

export function vmNavClassWithIcon({ isActive }) {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium leading-tight ${isActive ? vmNavActive : vmNavInactive}`
}

/** Conteneur nav desktop (pilule) */
export const vmNavPill =
  `inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-1 ${vmElevation1} dark:border-slate-600/90 dark:from-slate-800 dark:to-slate-900/95`
