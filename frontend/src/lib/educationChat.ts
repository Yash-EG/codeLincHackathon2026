// Client for the benefits-EDUCATION chatbot (backend: POST /api/education/chat).
//
// This is a SEPARATE capability from the procedure-estimate assistant in
// lib/useAssistant.ts. It answers general benefits questions ("what is a
// deductible?") and, when verified plan facts are available server-side,
// personal-plan questions. It never computes prices — those become an estimate
// handoff.
//
// There is no built-in fallback: if the backend can't answer, askEducation throws and the
// chat says so, rather than inventing an answer.

import { apiFetch, errorMessage } from './apiError'

/** Mirrors the backend EducationIntent enum. */
export type EducationIntent =
  | 'GENERAL_DEFINITION'
  | 'PERSONAL_PLAN_QUESTION'
  | 'ESTIMATE_REQUEST'
  | 'OUT_OF_SCOPE'

/** Mirrors the backend EducationChatResponse DTO. */
export interface EducationChatResponse {
  intent: EducationIntent
  answer: string
  /** false = personal question but no verified facts; true = facts used; null = not a personal question. */
  personalPlanDataAvailable: boolean | null
  estimateHandoff: boolean
  termsUsed: string[]
  modelUsed: boolean
  /** Where the answer came from. */
  source: 'backend'
}

/**
 * Ask the education chatbot (Amazon Bedrock via the backend). Throws if the backend can't answer.
 * memberId is the employee checked in at Reception, so "have I met my deductible?" is answered from
 * their plan, the same one the estimates use.
 */
export async function askEducation(message: string, memberId?: string): Promise<EducationChatResponse> {
  const res = await apiFetch('/api/education/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(memberId ? { message, memberId } : { message }),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = (await res.json()) as Omit<EducationChatResponse, 'source'>
  return { ...data, source: 'backend' }
}
