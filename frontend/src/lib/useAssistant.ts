import { useCallback } from 'react'
import { PROCEDURES } from '../data/mockData'
import { buildEstimateContext } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { useUiStore } from '../store/uiStore'
import { analyze } from './analyzeApi'
import { estimateProcedures, totalsFor } from './estimate'
import { nextId } from './id'
import { sendAssistantMessage, type AssistantReply } from './mockAssistant'
import { compareTiming, nextYearContext, toRequests } from './sequencing'

/**
 * The Neon user whose trusted plan/usage the backend prices against. The demo
 * seed data (db/migrations/V2) is user "1". Change here if the demo user differs.
 */
const DEMO_USER_ID = '1'

/**
 * Sends a message to the benefits assistant. Tries the real backend analyzer
 * first (POST /api/analyze, Bedrock intent + Neon-priced estimates); if that is
 * unreachable or errors, falls back to the offline mock so the demo keeps
 * working. Records both sides of the conversation, adds any priced procedures to
 * the plan, and keeps the analysis. Returns null when no plan is checked in.
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
      // --- Backend first: real Bedrock intent + Neon-priced estimates. --------
      // On any error (backend down, offline demo) we fall through to the mock.
      try {
        const toothSuffix =
          session.selectedTooth != null ? ` on tooth #${session.selectedTooth}` : ''
        const result = await analyze({ userId: DEMO_USER_ID, message: text + toothSuffix })
        const store = useSessionStore.getState()
        store.appendMessage({
          id: nextId('msg'),
          role: 'assistant',
          content: result.content,
          lineItems: result.lineItems,
        })
        if (result.requests.length > 0) store.addProcedures(result.requests)
        if (result.analysis) {
          store.setAiAnalysis(result.analysis)
          store.setProcedureInput(text)
        }
        return {
          content: result.content,
          requests: result.requests,
          lineItems: result.lineItems,
          deferred: [],
          analysis: result.analysis,
        }
      } catch (err) {
        // Backend unreachable or errored — fall back to the offline mock below.
        console.warn('Backend analyze failed; using offline mock assistant.', err)
      }

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
