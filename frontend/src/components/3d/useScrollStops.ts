import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { RoomId } from '../../rooms'
import { useSceneStore } from '../../store/sceneStore'

gsap.registerPlugin(ScrollTrigger)

/**
 * Links native page scroll to the camera stops. Every [data-camera] section in
 * <main> gets a ScrollTrigger that runs from "section top at 60% of the
 * viewport" to "section bottom at 60%". Sections are stacked in order, so the
 * sum of all trigger progresses is (index of the current section + the
 * fraction scrolled through it), which is what the camera rig reads.
 */
export function useScrollStops(room: RoomId) {
  useLayoutEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    let triggers: ScrollTrigger[] = []
    let signature: string | null = null
    const progress = () => triggers.reduce((sum, t) => sum + t.progress, 0)

    const build = () => {
      const sections = Array.from(main.querySelectorAll<HTMLElement>('[data-camera]'))
      const ids = sections.map((s) => s.dataset.camera ?? '')
      if (ids.join('|') === signature) {
        // Same sections, new sizes (fonts, forms opening): just re-measure.
        ScrollTrigger.refresh()
        return
      }
      signature = ids.join('|')
      triggers.forEach((t) => t.kill())
      triggers = sections.map((section) =>
        ScrollTrigger.create({
          trigger: section,
          start: 'top 60%',
          end: 'bottom 60%',
          onUpdate: () => useSceneStore.getState().setProgress(progress()),
        }),
      )
      ScrollTrigger.refresh()
      useSceneStore.getState().setSections(ids, progress())
    }

    build()
    // Content changes within a room (e.g. a plan gets checked in) add or remove sections.
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(build)
    })
    observer.observe(main)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      triggers.forEach((t) => t.kill())
    }
  }, [room])
}
