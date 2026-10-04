import { useCallback } from 'react'
import { PROCEDURES } from '../data/mockData'
import { buildEstimateContext } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { useUiStore } from '../store/uiStore'
import { estimateProcedures, totalsFor } from './estimate'
import { nextId } from './id'
import { sendAssistantMessage, type AssistantReply } from './mockAssistant'
import { compareTiming, nextYearContext, toRequests } from './sequencing'

/**
 * Sends a message to the benefits assistant (the offline mock today, Bedrock via
 * POST /api/assistant/chat later), records both sides of the conversation, adds
 * any procedures it priced to the plan (this year or after the reset) and keeps
 * its analysis. Returns null when no plan is checked in.
 */
export function useAssistant() {
  return useCallback(async (text: string): Promise<AssistantReply | null> => {
    const session = useSessionStore.getState()
    const ctx = buildEstimateContext(session)
    const { benefits, plan } = session
    if (!ctx || !benefits || !plan) return null
    const nextYear = nextYearContext(ctx, plan)
    const deferred = session.treatmentPlan.filter((t) => t.recommendedDate > benefits.planYearEnd)
    const alreadyNextYear = toRequests(deferred)

    session.appendMessage({ id: nextId('msg'), role: 'user', content: text, toothNumber: session.selectedTooth })
    useUiStore.getState().setThinking(true)
    try {
      const current = estimateProcedures(session.procedures, ctx)
      const reply = await sendAssistantMessage(text, session.selectedTooth, {
        procedures: PROCEDURES,
        planned: session.procedures,
        deferred,
        claims: session.claims,
        estimate: (newRequests) => {
          const ids = new Set(newRequests.map((r) => r.id))
          return estimateProcedures([...session.procedures, ...newRequests], ctx).filter((li) => ids.has(li.request.id))
        },
        estimateNextYear: (newRequests) => {
          const ids = new Set(newRequests.map((r) => r.id))
          return estimateProcedures([...alreadyNextYear, ...newRequests], nextYear).filter((li) => ids.has(li.request.id))
        },
        compare: (now, later) => compareTiming([...session.procedures, ...now], later, ctx, nextYear, alreadyNextYear),
        planName: benefits.planName,
        planYearEnd: benefits.planYearEnd,
        daysRemaining: benefits.daysRemaining,
        remainingBeforePlan: benefits.remainingMaximum,
        plannedPlanPays: totalsFor(current, 'IN_NETWORK').planPays,
      })
      const store = useSessionStore.getState()
      store.appendMessage({ id: nextId('msg'), role: 'assistant', content: reply.content, lineItems: reply.lineItems })
      if (reply.requests.length > 0) store.addProcedures(reply.requests)
      if (reply.deferred.length > 0) store.deferToNextYear(reply.deferred)
      if (reply.analysis) {
        store.setAiAnalysis(reply.analysis)
        store.setProcedureInput(text)
      }
      return reply
    } finally {
      useUiStore.getState().setThinking(false)
    }
  }, [])
}
