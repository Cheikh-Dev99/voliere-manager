/**
 * Écran de chargement — GIF thématique par rubrique (cages, couples, reproductions, sorties, défaut).
 */

import { SiteBackgroundDecor } from '../layout/SiteBackgroundDecor'
import { getLoadingGifSrc } from './loadingGifAssets'

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {import('./loadingGifAssets').LoadingGifContext} [props.loadingContext]
 */
export function LoadingGifGraphic({ className = 'h-24 w-auto sm:h-28', loadingContext = 'default' }) {
  const src = getLoadingGifSrc(loadingContext)
  return (
    <span
      className={`vm-pigeon-root inline-flex items-center justify-center ${className}`}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        decoding="async"
        draggable={false}
        className="vm-loading-gif max-h-full w-auto object-contain"
        style={{ filter: 'url(#vm-loading-gif-knockout)' }}
      />
    </span>
  )
}

/**
 * @param {object} props
 * @param {'fullscreen' | 'embedded' | 'compact' | 'inline'} [props.variant]
 * @param {string} [props.message]
 * @param {string} [props.subtitle]
 * @param {import('./loadingGifAssets').LoadingGifContext} [props.loadingContext]
 */
export function AppLoadingScreen({
  variant = 'fullscreen',
  message = 'Chargement…',
  subtitle,
  loadingContext = 'default',
}) {
  const gif = <LoadingGifGraphic loadingContext={loadingContext} className="h-20 w-auto sm:h-28" />

  if (variant === 'compact') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-8 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
      >
        {gif}
        <p className="text-sm font-medium text-slate-600">{message}</p>
        {subtitle ? <p className="max-w-sm text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div
        className="mt-3 flex flex-col items-center gap-2 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
      >
        <LoadingGifGraphic loadingContext={loadingContext} className="h-14 w-auto opacity-90" />
        <p className="text-[11px] text-slate-500 sm:text-xs">{message}</p>
      </div>
    )
  }

  if (variant === 'embedded') {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/98 via-slate-50/85 to-teal-50/45 px-6 py-14 text-center shadow-sm ring-1 ring-slate-900/[0.04]"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.2]" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgb(45 212 191 / 0.18), transparent 42%), radial-gradient(circle at 85% 75%, rgb(148 163 184 / 0.15), transparent 48%)',
            }}
          />
        </div>
        <div className="relative z-[1] flex flex-col items-center">
          {gif}
          <p className="mt-4 text-sm font-semibold text-slate-800">{message}</p>
          {subtitle ? (
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">{subtitle}</p>
          ) : null}
          <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
            <span className="vm-loading-dot size-2 rounded-full bg-teal-500/80" />
            <span className="vm-loading-dot size-2 rounded-full bg-teal-500/80" />
            <span className="vm-loading-dot size-2 rounded-full bg-teal-500/80" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/40 px-6 py-12 text-slate-700"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <SiteBackgroundDecor />
      <div className="relative z-[1] flex max-w-sm flex-col items-center text-center">
        {gif}
        <p className="mt-6 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{message}</p>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Volière Manager</p>
        )}
        <div className="mt-8 flex justify-center gap-2" aria-hidden>
          <span className="vm-loading-dot size-2.5 rounded-full bg-teal-600/90" />
          <span className="vm-loading-dot size-2.5 rounded-full bg-teal-600/90" />
          <span className="vm-loading-dot size-2.5 rounded-full bg-teal-600/90" />
        </div>
      </div>
    </div>
  )
}
