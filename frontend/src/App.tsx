import { useCallback, useMemo, useState } from 'react'
import AnnualMaxProgress from './components/AnnualMaxProgress'
import DashboardLayout from './components/layout/DashboardLayout'
import TopBar from './components/layout/TopBar'
import type { ToothHistoryEntry } from './components/ToothInspector'
import ToothStage from './components/ToothStage'
import AssistantSidebar, { type SidebarTab } from './components/sidebar/AssistantSidebar'
import ChatPanel from './components/sidebar/ChatPanel'
import CostBreakdown from './components/sidebar/CostBreakdown'
import {
  BENEFIT_SUMMARY,
  CLAIMS,
  COVERAGE_TIERS,
  JARGON_TRANSLATIONS,
  PLAN,
  PROCEDURES,
  TREATMENT_PLAN,
} from './data/mockData'
import { getTooth } from './data/teeth'
import { estimateProcedures, totalsFor, type EstimateContext } from './lib/estimate'
import { formatShortDate, formatUsd } from './lib/format'
import { nextId } from './lib/id'
import { sendAssistantMessage } from './lib/mockAssistant'
import type { ChatMessage, NetworkTier, ProcedureRequest, ToothStatus } from './types/domain'

const summary = BENEFIT_SUMMARY

/** Treatment-plan items that fall inside the current plan year seed the breakdown. */
const INITIAL_REQUESTS: ProcedureRequest[] = TREATMENT_PLAN.filter((item) => item.recommendedDate <= summary.planYearEnd)
  .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  .map((item) => ({
    id: item.id,
    cdtCode: item.cdtCode,
    toothNumber: item.toothNumber,
    surfaces: item.surfaces ?? undefined,
    recommendedDate: item.recommendedDate,
  }))

const ESTIMATE_CONTEXT: EstimateContext = {
  procedures: PROCEDURES,
  tiers: COVERAGE_TIERS,
  oonAllowedRatio: PLAN.oonAllowedRatio,
  deductibleRemaining: {
    IN_NETWORK: summary.deductibleRemaining,
    OUT_OF_NETWORK: Math.max(PLAN.deductibleIndividualOut - summary.deductibleMet, 0),
  },
  remainingMaximum: summary.remainingMaximum,
}

const SUGGESTIONS = [
  'I need a crown on my upper right molar',
  'Can I get another cleaning this year?',
  'What expires on Dec 31?',
]

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    `Hi ${summary.fullName.split(' ')[0]}. I've loaded your ${summary.planName} benefits: ` +
    `${formatUsd(summary.remainingMaximum)} of your ${formatUsd(summary.effectiveMaximum)} maximum is left, ` +
    `and it resets in ${summary.daysRemaining} days. Click a tooth or describe what your dentist recommended, ` +
    `and I'll show what insurance covers and what you'd pay.`,
}

export default function App() {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [requests, setRequests] = useState<ProcedureRequest[]>(INITIAL_REQUESTS)
  const [isThinking, setIsThinking] = useState(false)
  const [network, setNetwork] = useState<NetworkTier>('IN_NETWORK')
  const [tab, setTab] = useState<SidebarTab>('assistant')

  const lineItems = useMemo(() => estimateProcedures(requests, ESTIMATE_CONTEXT), [requests])
  const totals = useMemo(() => totalsFor(lineItems, network), [lineItems, network])

  const toothStatus = useMemo(() => {
    const status: Partial<Record<number, ToothStatus>> = {}
    for (const claim of CLAIMS) if (claim.toothNumber != null) status[claim.toothNumber] = 'treated'
    for (const request of requests) if (request.toothNumber != null) status[request.toothNumber] = 'planned'
    return status
  }, [requests])

  const historyFor = useCallback(
    (toothNumber: number): ToothHistoryEntry[] => [
      ...CLAIMS.filter((c) => c.toothNumber === toothNumber).map((c) => ({
        kind: 'treated' as const,
        label: PROCEDURES[c.cdtCode]?.shortName ?? c.cdtCode,
        detail: formatShortDate(c.serviceDate),
      })),
      ...lineItems
        .filter((li) => li.request.toothNumber === toothNumber)
        .map((li) => ({
          kind: 'planned' as const,
          label: li.procedure.shortName,
          detail: li.request.recommendedDate ? formatShortDate(li.request.recommendedDate) : 'Not scheduled',
        })),
    ],
    [lineItems],
  )

  const handleSend = useCallback(
    async (text: string) => {
      setMessages((m) => [...m, { id: nextId('msg'), role: 'user', content: text, toothNumber: selectedTooth }])
      setIsThinking(true)
      setTab('assistant')
      try {
        const reply = await sendAssistantMessage(text, selectedTooth, {
          procedures: PROCEDURES,
          planned: requests,
          claims: CLAIMS,
          estimate: (newRequests) => {
            const ids = new Set(newRequests.map((r) => r.id))
            return estimateProcedures([...requests, ...newRequests], ESTIMATE_CONTEXT).filter((li) =>
              ids.has(li.request.id),
            )
          },
          planName: summary.planName,
          planYearEnd: summary.planYearEnd,
          daysRemaining: summary.daysRemaining,
          remainingBeforePlan: summary.remainingMaximum,
          plannedPlanPays: totalsFor(lineItems, 'IN_NETWORK').planPays,
        })
        setMessages((m) => [
          ...m,
          { id: nextId('msg'), role: 'assistant', content: reply.content, lineItems: reply.lineItems },
        ])
        if (reply.requests.length > 0) setRequests((r) => [...r, ...reply.requests])
      } finally {
        setIsThinking(false)
      }
    },
    [selectedTooth, requests, lineItems],
  )

  const handleRemove = useCallback((requestId: string) => {
    setRequests((r) => r.filter((req) => req.id !== requestId))
  }, [])

  return (
    <DashboardLayout
      header={<TopBar summary={summary} />}
      main={
        <>
          <AnnualMaxProgress
            summary={summary}
            plannedPlanPays={totals.planPays}
            overMaximum={totals.overMaximum}
          />
          <ToothStage
            selectedTooth={selectedTooth}
            hoveredTooth={hoveredTooth}
            toothStatus={toothStatus}
            historyFor={historyFor}
            busy={isThinking}
            onToothSelect={setSelectedTooth}
            onToothHover={setHoveredTooth}
            onAsk={handleSend}
          />
        </>
      }
      sidebar={
        <AssistantSidebar
          tab={tab}
          onTabChange={setTab}
          breakdownCount={requests.length}
          chat={
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              selectedTooth={getTooth(selectedTooth)}
              suggestions={SUGGESTIONS}
              onSend={handleSend}
              onClearTooth={() => setSelectedTooth(null)}
              onViewBreakdown={() => setTab('breakdown')}
            />
          }
          breakdown={
            <CostBreakdown
              items={lineItems}
              network={network}
              onNetworkChange={setNetwork}
              onRemove={handleRemove}
              translations={JARGON_TRANSLATIONS}
            />
          }
        />
      }
    />
  )
}
