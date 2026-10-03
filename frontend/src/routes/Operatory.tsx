import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Bot, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router'
import { useShallow } from 'zustand/react/shallow'
import Panel from '../components/Panel'
import RoomGate from '../components/RoomGate'
import RoomIntro from '../components/RoomIntro'
import ToothInspector from '../components/ToothInspector'
import ToothPicker from '../components/ToothPicker'
import { buttonPrimary, fieldInput, textLink } from '../components/ui'
import { getTooth } from '../data/teeth'
import { formatShortDate, formatUsd } from '../lib/format'
import { useAssistant } from '../lib/useAssistant'
import { ROOMS_BY_ID } from '../rooms'
import { useLineItems, useToothHistory, useToothStatus } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { announce, useUiStore } from '../store/uiStore'

const room = ROOMS_BY_ID.operatory

type ReplySource = 'describe' | 'tooth'

export default function Operatory() {
  const ask = useAssistant()
  const isThinking = useUiStore((s) => s.isThinking)
  const { selectedTooth, selectTooth, removeProcedure } = useSessionStore(
    useShallow((s) => ({ selectedTooth: s.selectedTooth, selectTooth: s.selectTooth, removeProcedure: s.removeProcedure })),
  )
  const toothStatus = useToothStatus()
  const history = useToothHistory(selectedTooth)
  const lineItems = useLineItems()
  const tooth = getTooth(selectedTooth)
  const [reply, setReply] = useState<{ source: ReplySource; text: string } | null>(null)

  async function run(text: string, source: ReplySource) {
    const result = await ask(text)
    if (!result) return
    setReply({ source, text: result.content })
    announce(result.content)
  }

  return (
    <>
      <RoomIntro room={room} />
      <RoomGate prerequisite="plan">
        <Panel id="describe" title="Describe your care">
          <DescribeForm busy={isThinking} toothNumber={selectedTooth} onSubmit={(text) => void run(text, 'describe')} />
          {reply?.source === 'describe' && <ReplyBox text={reply.text} />}
        </Panel>

        <Panel id="tooth-map" title="Pick a tooth">
          <p>
            Choose the tooth your dentist mentioned. Numbers follow the Universal system printed on dental bills, shown
            the way your dentist sees your mouth.
          </p>
          <ToothPicker selectedTooth={selectedTooth} toothStatus={toothStatus} onSelect={selectTooth} />
          {tooth && (
            <ToothInspector
              tooth={tooth}
              status={toothStatus[tooth.number]}
              history={history}
              disabled={isThinking}
              onAsk={(prompt) => void run(prompt, 'tooth')}
              onClose={() => selectTooth(null)}
            />
          )}
          {reply?.source === 'tooth' && <ReplyBox text={reply.text} />}
        </Panel>

        <Panel id="planned" title="Planned care">
          {lineItems.length === 0 ? (
            <p>Nothing planned yet. Describe your care or pick a tooth above.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {lineItems.map((item) => (
                <li key={item.request.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">
                      {item.procedure.shortName}
                      {item.request.toothNumber != null && <> · tooth #{item.request.toothNumber}</>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {item.request.recommendedDate ? formatShortDate(item.request.recommendedDate) : 'Not scheduled'} · you
                      pay about {formatUsd(item.byNetwork.IN_NETWORK.patientPays)} in-network
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeProcedure(item.request.id)
                      announce(`Removed ${item.procedure.shortName} from your plan.`)
                    }}
                    className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-muted transition hover:bg-cream hover:text-ink"
                    aria-label={`Remove ${item.procedure.shortName}${item.request.toothNumber != null ? ` on tooth ${item.request.toothNumber}` : ''}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link to="/billing" className={`${textLink} inline-flex items-center gap-1`}>
            See the full cost breakdown in Billing <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Panel>
      </RoomGate>
    </>
  )
}

function DescribeForm({
  busy,
  toothNumber,
  onSubmit,
}: {
  busy: boolean
  toothNumber: number | null
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value) {
      setError('Describe the care first, for example "crown on my lower left molar".')
      inputRef.current?.focus()
      return
    }
    setError(null)
    onSubmit(value)
    setText('')
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="describe-input" className="block font-semibold text-ink">
          What did your dentist recommend?
        </label>
        <p id="describe-hint" className="text-sm text-ink-muted">
          In your own words, e.g. &ldquo;crown on my lower left molar&rdquo; or &ldquo;two-surface filling on #30&rdquo;.
          {toothNumber != null && <> Tooth #{toothNumber} is selected and is used if you don&rsquo;t name one.</>}
        </p>
        <textarea
          ref={inputRef}
          id="describe-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'describe-hint describe-error' : 'describe-hint'}
          className={fieldInput}
        />
        {error && (
          <p id="describe-error" className="mt-1 flex items-start gap-1.5 text-sm font-medium text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={busy} className={buttonPrimary}>
        {busy ? 'Reading your plan…' : 'Price it'}
      </button>
    </form>
  )
}

function ReplyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-line bg-sky p-4">
      <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <Bot className="size-4 text-primary" aria-hidden="true" /> Assistant
      </p>
      <p className="text-ink">{text}</p>
    </div>
  )
}
