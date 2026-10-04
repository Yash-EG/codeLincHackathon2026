import { useCallback } from 'react'
import { buildEstimateContext } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { useUiStore } from '../store/uiStore'
import type { AiAnalysis, CostLineItem, ProcedureRequest, TreatmentPlanItem } from '../types/domain'
import { analyze } from './analyzeApi'
import { nextId } from './id'

/** What the assistant said, plus anything it priced. */
export interface AssistantReply {
  content: string
  requests: ProcedureRequest[]
  lineItems: CostLineItem[]
  deferred: TreatmentPlanItem[]
  analysis: AiAnalysis | null
}

/**
 * Sends a message to the benefits assistant: POST /api/analyze (Bedrock reads the
 * intent, Neon prices it). There is no offline stand-in, so when the backend
 * can't answer the chat says so, with the reason, instead of making something up.
 * Records both sides of the conversation, adds any priced procedures to the plan
 * and keeps the analysis. Returns null when no plan is loaded.
 */
export function useAssistant() {
  return useCallback(async (text: string): Promise<AssistantReply | null> => {
    const session = useSessionStore.getState()
    const ctx = buildEstimateContext(session)
    if (!ctx || !session.benefits || !session.plan) return null

    session.appendMessage({ id: nextId('msg'), role: 'user', content: text, toothNumber: session.selectedTooth })
    useUiStore.getState().setThinking(true)
    try {
      const toothSuffix = session.selectedTooth != null ? ` on tooth #${session.selectedTooth}` : ''
      // Priced against the member checked in at Reception (the demo user until someone is).
      const result = await analyze({ userId: session.memberId, message: text + toothSuffix })
      const store = useSessionStore.getState()
      store.appendMessage({ id: nextId('msg'), role: 'assistant', content: result.content, lineItems: result.lineItems })
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
      const reason = err instanceof Error ? err.message : 'unknown error'
      const content = `I couldn't get an answer from the estimate service (${reason}). Nothing was priced.`
      useSessionStore.getState().appendMessage({ id: nextId('msg'), role: 'assistant', content })
      return { content, requests: [], lineItems: [], deferred: [], analysis: null }
    } finally {
      useUiStore.getState().setThinking(false)
    }
  }, [])
}
