import { Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useDentalStore } from '../store/useDentalStore'
import { eyebrow, textLink } from './ui'

/**
 * The co-pilot's latest note, shown right where the member just acted (under
 * the tooth chart, under the plan numbers) so they don't have to scroll to the
 * chat to see what a click meant.
 */
export default function CopilotNote({ className = '' }: { className?: string }) {
  const last = useDentalStore((s) => s.chatHistory.at(-1))
  if (!last || last.sender !== 'assistant' || last.kind !== 'context') return null
  return (
    <aside
      aria-label="Co-pilot note"
      className={`rounded-xl border border-teal-200/70 bg-sage/40 p-4 ${className}`}
    >
      <p className={`${eyebrow} flex items-center gap-1.5 text-primary`}>
        <Sparkles className="size-3" aria-hidden="true" /> Co-pilot
      </p>
      <p className="mt-1.5 max-w-[62ch] text-ink">{last.text}</p>
      <p className="mt-2 text-sm">
        <Link to="/imaging#ask" className={textLink}>
          Ask a follow-up
        </Link>
      </p>
    </aside>
  )
}
