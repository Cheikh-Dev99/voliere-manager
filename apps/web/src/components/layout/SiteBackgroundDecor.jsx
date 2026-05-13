import { useId } from 'react'
import { Bird, Egg } from 'lucide-react'

/**
 * Fond filigrané (dégradé + motif volière + silhouettes) — même charte que la page de connexion.
 * À placer dans un conteneur `relative` couvrant la hauteur utile (`min-h-screen` typiquement).
 */
export function SiteBackgroundDecor() {
  const uid = useId().replace(/:/g, '')
  const meshId = `site-cage-mesh-${uid}`
  const dotsId = `site-soft-dots-${uid}`
  const vignetteId = `site-vignette-${uid}`

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgb(45 212 191 / 0.12), transparent 45%),
            radial-gradient(circle at 80% 80%, rgb(148 163 184 / 0.2), transparent 50%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden>
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id={meshId}
              width="52"
              height="52"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(8)"
            >
              <path
                d="M0 52 V0 M26 0 v52 M52 0 V52 M0 26 h52"
                fill="none"
                stroke="rgb(13 148 136 / 0.07)"
                strokeWidth="0.65"
              />
            </pattern>
            <pattern id={dotsId} width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.9" fill="rgb(15 118 110 / 0.06)" />
            </pattern>
            <radialGradient id={vignetteId} cx="50%" cy="42%" r="65%">
              <stop offset="0%" stopColor="rgb(45 212 191)" stopOpacity="0.09" />
              <stop offset="55%" stopColor="rgb(13 148 136)" stopOpacity="0.03" />
              <stop offset="100%" stopColor="rgb(15 23 42)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${meshId})`} />
          <rect width="100%" height="100%" fill={`url(#${dotsId})`} />
          <rect width="100%" height="100%" fill={`url(#${vignetteId})`} />
        </svg>
        <svg
          className="absolute left-1/2 top-[42%] h-[min(120vmin,56rem)] w-[min(120vmin,56rem)] -translate-x-1/2 -translate-y-1/2 text-teal-600/[0.055]"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" strokeWidth="0.35" />
          <circle cx="100" cy="100" r="58" fill="none" stroke="currentColor" strokeWidth="0.28" />
          <circle cx="100" cy="100" r="38" fill="none" stroke="currentColor" strokeWidth="0.22" />
        </svg>
        <div className="absolute -left-10 top-[4%] text-teal-600/[0.09] sm:-left-6 sm:top-[8%]">
          <Bird className="h-44 w-44 -rotate-[16deg] sm:h-64 sm:w-64" strokeWidth={0.9} />
        </div>
        <div className="absolute -right-12 bottom-[6%] text-teal-700/[0.075] sm:-right-8 sm:bottom-[10%]">
          <Bird className="h-52 w-52 rotate-[22deg] scale-x-[-1] sm:h-72 sm:w-72" strokeWidth={0.85} />
        </div>
        <div className="absolute right-[8%] top-[18%] hidden text-slate-400/[0.12] md:block">
          <Bird className="h-32 w-32 rotate-[8deg]" strokeWidth={0.75} />
        </div>
        <div className="absolute bottom-[12%] left-[6%] text-teal-800/[0.06] sm:bottom-[18%]">
          <Egg className="h-28 w-28 rotate-[18deg] sm:h-36 sm:w-36" strokeWidth={0.85} />
        </div>
      </div>
    </>
  )
}
