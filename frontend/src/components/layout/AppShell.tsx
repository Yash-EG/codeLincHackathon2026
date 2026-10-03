import { lazy, Suspense, useLayoutEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useReducedMotion } from '../../a11y/useReducedMotion'
import { useRouteFocus } from '../../a11y/useRouteFocus'
import { roomForPath } from '../../rooms'
import { useViewMode } from '../../store/settingsStore'
import SceneErrorBoundary from '../SceneErrorBoundary'
import AskAiDialog from './AskAiDialog'
import Header from './Header'
import LiveRegion from './LiveRegion'
import MaxBar from './MaxBar'
import SkipLink from './SkipLink'

// The 3D layer (three.js, R3F, GSAP) is its own chunk: traditional view never downloads it.
const SceneRoot = lazy(() => import('../../scenes/common/SceneRoot'))

/**
 * The persistent layout around every room. The DOM is the real site; the 3D
 * office is an aria-hidden background behind it that follows native scroll.
 */
export default function AppShell() {
  const view = useViewMode()
  const reducedMotion = useReducedMotion()
  const { pathname } = useLocation()
  const room = roomForPath(pathname)
  useRouteFocus()

  // Set before paint so panels never flash the wrong style.
  useLayoutEffect(() => {
    document.documentElement.dataset.view = view
  }, [view])

  return (
    <>
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="pb-[calc(var(--maxbar-h,0px)+2.5rem)] short:pb-10">
        <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 traditional:mx-auto traditional:max-w-3xl immersive:max-w-xl immersive:lg:ml-[max(1.5rem,6vw)]">
          <Outlet />
        </div>
      </main>
      <MaxBar />
      <AskAiDialog />
      <LiveRegion />
      <ScrollRestoration />
      {view === 'immersive' && (
        <SceneErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <SceneRoot room={room?.id ?? 'hallway'} reducedMotion={reducedMotion} />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </>
  )
}
