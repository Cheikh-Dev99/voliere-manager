/**
 * Classes UI alignées sur la page Sorties (référence contraste mode sombre).
 * @see apps/web/src/pages/SortiesPage.jsx
 */

/** Champ formulaire (input, select, textarea). */
export function dmFieldClass(err) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${
    err
      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500'
      : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

/** Panneau filtres (liste / historique). */
export const dmFilterCard =
  'space-y-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm sm:p-4'

/** Formulaire principal type Sorties (colonne gauche). */
export const dmFormCard =
  'space-y-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4 shadow-sm sm:p-5'

/** Coque formulaire page dédiée (création / édition). */
export const dmFormShell =
  'space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900'

/** Coque formulaire sans space-y (grille interne). */
export const dmFormShellCompact =
  'rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900'

export const dmDataTableCard =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]'

export const dmDataTableHeader =
  'border-b border-teal-100 bg-gradient-to-r from-teal-50/90 via-white to-slate-50/80 px-4 py-3 dark:border-slate-700 dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-900'

export const dmDataTableTitle = 'text-sm font-semibold text-slate-800 dark:text-slate-100'

export const dmDataTableSub = 'mt-0.5 text-xs text-slate-500 dark:text-slate-400'

export const dmTableWrap = 'overflow-x-auto md:overflow-x-visible'

/** @param {string} minWidthClass ex. 'min-w-[640px]' */
export function dmTableClass(minWidthClass) {
  return `w-full ${minWidthClass} divide-y divide-slate-200 text-left text-sm md:min-w-0 dark:divide-slate-700`
}

export const dmThead =
  'border-b border-slate-200 bg-slate-100/90 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300'

export const dmTbody = 'divide-y divide-slate-100 dark:divide-slate-700'

export const dmTrStriped =
  'transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-teal-50/40 dark:odd:bg-slate-900 dark:even:bg-slate-800/50 dark:hover:bg-teal-950/40'

export const dmTrStripedAlt =
  'transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-teal-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/60 dark:hover:bg-teal-950/40'

export const dmInputSearch =
  'w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30'

export const dmInputSearchCompact =
  'w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30'

export const dmSelect =
  'w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30'

export const dmLabelXs = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400'

export const dmLabelSm = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'

export const dmSortDirButton =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'

export const dmFilterResetRow =
  'flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700'

export const dmGhostButton =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
