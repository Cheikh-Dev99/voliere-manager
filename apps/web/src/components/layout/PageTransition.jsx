import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

/**
 * Transition visible à chaque changement de route (View Transitions API + fallback CSS).
 */
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const isFirstRender = useRef(true)
  const [frame, setFrame] = useState(() => ({ location, outlet }))

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      setFrame({ location, outlet })
      return
    }

    const apply = () => setFrame({ location, outlet })

    if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
      document.startViewTransition(apply)
    } else {
      apply()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- outlet instable ; transition au changement d’URL seulement
  }, [location.pathname, location.search, location.hash, location.key])

  return (
    <div
      key={`${frame.location.pathname}${frame.location.search}${frame.location.hash}-${frame.location.key}`}
      className="vm-page-enter min-w-0"
      aria-live="polite"
    >
      {frame.outlet}
    </div>
  )
}
