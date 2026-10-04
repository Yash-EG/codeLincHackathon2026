import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import { getTooth } from '../../data/teeth'
import { useAssistant } from '../../lib/useAssistant'
import { useSessionStore } from '../../store/sessionStore'
import { announce, useUiStore } from '../../store/uiStore'
import ChatPanel from '../assistant/ChatPanel'
import { buttonPrimary, buttonSecondary } from '../ui'

const SUGGESTIONS = [
  'I might need a root canal',
  'I need a crown on my upper right molar',
  'Can I get another cleaning this year?',
  'What expires on Dec 31?',
]

/**
 * The benefits assistant (Bedrock, via POST /api/analyze) in a native
 * modal <dialog>: the page behind is inert, Escape closes it, and focus goes
 * back to the button that opened it.
 */
export default function AskAiDialog() {
  const open = useUiStore((s) => s.askAiOpen)
  const closeAskAi = useUiStore((s) => s.closeAskAi)
  const isThinking = useUiStore((s) => s.isThinking)
  const { messages, selectedTooth, hasPlan, selectTooth, loadSamplePlan } = useSessionStore(
    useShallow((s) => ({
      messages: s.messages,
      selectedTooth: s.selectedTooth,
      hasPlan: s.plan != null,
      selectTooth: s.selectTooth,
      loadSamplePlan: s.loadSamplePlan,
    })),
  )
  const ask = useAssistant()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => {
      closeAskAi()
      // Most browsers restore focus themselves; only step in if focus was dropped.
      if (!document.activeElement || document.activeElement === document.body) openerRef.current?.focus()
    }
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [closeAskAi])

  function closeAndGo(to: string) {
    dialogRef.current?.close()
    navigate(to)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ask-ai-title"
      aria-describedby="ask-ai-description"
      className="m-auto h-[min(44rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-ink/30 bg-surface p-0 text-ink open:flex backdrop:bg-ink/45"
    >
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 py-4">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-muted">Benefits assistant</p>
          <h2 id="ask-ai-title" className="mt-1 font-serif text-2xl leading-tight">
            Ask AI
          </h2>
          <p id="ask-ai-description" className="mt-0.5 text-sm text-ink-muted">
            Plain-English answers about your plan. Demo data; every number is an estimate, not a guarantee.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close Ask AI"
          className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {hasPlan ? (
          <ChatPanel
            messages={messages}
            isThinking={isThinking}
            selectedTooth={getTooth(selectedTooth)}
            suggestions={SUGGESTIONS}
            onSend={(text) => void ask(text)}
            onClearTooth={() => selectTooth(null)}
            onViewBreakdown={() => closeAndGo('/billing#line-items')}
          />
        ) : (
          <div className="space-y-4 px-5 py-6">
            <p>The assistant answers questions about your plan, so it needs one checked in first.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  loadSamplePlan()
                  announce('Sample plan checked in: Lincoln Preferred PPO.')
                }}
                className={buttonPrimary}
              >
                Use the sample plan
              </button>
              <button
                type="button"
                onClick={() => closeAndGo('/reception#check-in')}
                className={buttonSecondary}
              >
                Enter my plan at Reception
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  )
}
