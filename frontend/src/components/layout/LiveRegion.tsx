import { useUiStore } from '../../store/uiStore'

/** The one polite live region: room arrivals, "added to your plan", reply summaries. */
export default function LiveRegion() {
  const announcement = useUiStore((s) => s.announcement)
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  )
}
