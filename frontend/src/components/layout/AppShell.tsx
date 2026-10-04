import { lazy, Suspense, useLayoutEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useReducedMotion } from '../../a11y/useReducedMotion'
import { useRouteFocus } from '../../a11y/useRouteFocus'
import { roomForPath } from '../../rooms'
import { useCopilotFeed } from '../../store/useCopilotFeed'
import { useViewMode } from '../../store/settingsStore'
import { ParallaxBackdrop, ParallaxScene } from '../Parallax'
import SceneErrorBoundary from '../SceneErrorBoundary'
import AskAiDialog from './AskAiDialog'
import Header from './Header'
import LiveRegion from './LiveRegion'
import MaxBar from './MaxBar'
import SkipLink from './SkipLink'

// The 3D layer (three.js, R3F, GSAP) is its own chunk: traditional view never downloads it.
const SceneRoot = lazy(() => import('../3d/SceneRoot'))

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
  useCopilotFeed()

  // Set before paint so panels never flash the wrong style.
  useLayoutEffect(() => {
    document.documentElement.dataset.view = view
  }, [view])

  return (
    <>
      <SkipLink />
      <Header />
      {/* The side drawer behind the room's sections in the 3D view (lg and up). Decoration only. */}
      <div
        aria-hidden="true"
        className="grain pointer-events-none fixed inset-y-0 left-0 z-30 hidden w-(--drawer-w) border-r border-line bg-(--drawer-bg) immersive:lg:block"
      />
      <main id="main" tabIndex={-1} className="relative z-40 pb-[calc(var(--maxbar-h,0px)+2.5rem)] short:pb-10">
        <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 traditional:mx-auto traditional:max-w-3xl immersive:lg:w-(--drawer-w) immersive:lg:space-y-0 immersive:lg:px-12 immersive:lg:py-0">
          <Outlet />
        </div>
      </main>
      <MaxBar />
      <AskAiDialog />
      <LiveRegion />
      <ScrollRestoration />
      {view === 'traditional' && <ParallaxBackdrop />}
      {view === 'immersive' && (
        <SceneErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ParallaxScene>
              <SceneRoot room={room?.id ?? 'hallway'} reducedMotion={reducedMotion} />
            </ParallaxScene>
          </Suspense>
        </SceneErrorBoundary>
      )}
    </>
  )
}
