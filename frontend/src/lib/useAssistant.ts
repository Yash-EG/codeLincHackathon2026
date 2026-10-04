import { useCallback } from 'react'
import { buildEstimateContext } from '../store/selectors'
import { useSessionStore } from '../store/sessionStore'
import { useUiStore } from '../store/uiStore'
import type { AiAnalysis, CostLineItem, ProcedureRequest, TreatmentPlanItem } from '../types/domain'
import { analyze, type PendingProcedure } from './analyzeApi'
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
 * Multi-turn carry-over. When the backend returns a resumable clarification
 * (e.g. "which tooth?"), it includes the procedure it already resolved; we
 * remember it here and echo it back on the next message so a bare follow-up like
 * "19" is merged with that procedure instead of forcing the user to restate it.
 * Module-scoped so it survives across calls of the memoized callback below.
 */
let pendingContext: PendingProcedure | null = null

/** How many prior chat turns to include as context (keeps the prompt bounded). */
const MAX_CONTEXT_TURNS = 8

/**
 * Build a plain-English context preamble from the Operatory intake form and the
 * recent chat transcript, so a follow-up message carries everything the assistant
 * needs even when the user types only a short reply. Returns an empty string when
 * there is nothing to add. The preamble is clearly delimited and the user's own
 * message is labeled, so the backend reads it as context, not as the question —
 * and it never carries prices/coverage, which the backend still loads itself.
 */
function buildContextPreamble(
  form: ReturnType<typeof useSessionStore.getState>['exploreAnswers'],
  priorMessages: ReturnType<typeof useSessionStore.getState>['messages'],
): string {
  const lines: string[] = []

  if (form) {
    const parts = [
      form.patient && `for ${form.patient}`,
      form.procedure && `procedure: ${form.procedure}`,
      form.timing && `timing: ${form.timing}`,
      form.zip && `near ZIP ${form.zip}`,
      form.radius && form.radius,
    ].filter(Boolean)
    if (parts.length > 0) lines.push(`Intake form — ${parts.join('; ')}.`)
  }

  // Exclude the greeting and keep only the most recent turns, oldest first.
  const turns = priorMessages
    .filter((m) => m.id !== 'greeting')
    .slice(-MAX_CONTEXT_TURNS)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
  if (turns.length > 0) lines.push('Conversation so far:\n' + turns.join('\n'))

  return lines.length > 0 ? lines.join('\n\n') : ''
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

    // Snapshot the form + prior transcript BEFORE adding this turn, so the
    // preamble describes the context that preceded the user's new message.
    const preamble = buildContextPreamble(session.exploreAnswers, session.messages)

    session.appendMessage({ id: nextId('msg'), role: 'user', content: text, toothNumber: session.selectedTooth })
    useUiStore.getState().setThinking(true)
    try {
      const toothSuffix = session.selectedTooth != null ? ` on tooth #${session.selectedTooth}` : ''
      // The message sent to the backend = optional context preamble + the user's
      // question. The preamble gives the assistant the preceding form answers and
      // chat so a short follow-up still has full context.
      const question = text + toothSuffix
      const message = preamble ? `${preamble}\n\nCurrent question: ${question}` : question
      // Echo any pending procedure from the previous clarification so a bare
      // follow-up (e.g. "19") resolves against it without restating the procedure.
      // Priced against the member checked in at Reception (the demo user until someone is).
      const result = await analyze({
        userId: session.memberId,
        message,
        pending: pendingContext,
      })
      // Remember the backend's pending context for the next turn (set on a resumable
      // clarification, cleared once we get an estimate or an unresumable answer).
      pendingContext = result.pending
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
