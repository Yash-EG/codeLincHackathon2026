// The dental store from the challenge brief, as a thin view over the session
// store: one source of truth (sessionStorage), so the panels, the max bar, the
// assistant and the 3D coin jars always agree.
//
//   const { annualMax, used, pending } = useDentalStore()
//   const setProcedure = useDentalStore((s) => s.setProcedure)

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { AiAnalysis, ProcedureRequest } from '../types/domain'
import { useAnnualMax } from './selectors'
import { useSessionStore, type DecodeChatMessage, type ManualPlanInput } from './sessionStore'

export interface DentalState {
  /** This plan year's maximum (sample plan: $1,500). 0 until a plan is checked in. */
  annualMax: number
  /** Paid by claims so far this plan year (sample plan: $400). */
  used: number
  /** What insurance would pay for the care planned this year (in-network). */
  pending: number
  /** e.g. "Lincoln Preferred PPO"; null until a plan is checked in. */
  selectedPlan: string | null
  /** What the user typed in "Describe your care" (default: "Root canal on tooth #14"). */
  procedureInput: string
  aiAnalysis: AiAnalysis | null
  /** The "Decode your plan" chatbot transcript. */
  chatHistory: DecodeChatMessage[]
  /** Care being priced this plan year. Append with addProcedure; the ledger and annual max follow. */
  plannedProcedures: ProcedureRequest[]
  /**
   * 'sample' checks in Lincoln Preferred PPO, 'high-option' the High-Option
   * sample, an object checks in a typed-in plan, null clears it.
   */
  setPlan: (plan: 'sample' | 'high-option' | ManualPlanInput | null) => void
  setProcedure: (text: string) => void
  setAiAnalysis: (analysis: AiAnalysis | null) => void
  updateBenefits: (patch: { annualMax?: number; used?: number }) => void
  addChatMessage: (message: Omit<DecodeChatMessage, 'timestamp'> & { timestamp?: string }) => void
  addProcedure: (procedure: ProcedureRequest) => void
}

export function useDentalStore(): DentalState
export function useDentalStore<T>(selector: (state: DentalState) => T): T
export function useDentalStore<T>(selector?: (state: DentalState) => T): T | DentalState {
  const s = useSessionStore(
    useShallow((s) => ({
      planName: s.plan?.planName ?? null,
      procedureInput: s.procedureInput,
      aiAnalysis: s.aiAnalysis,
      loadSamplePlan: s.loadSamplePlan,
      setManualPlan: s.setManualPlan,
      reset: s.reset,
      setProcedureInput: s.setProcedureInput,
      setAiAnalysis: s.setAiAnalysis,
      updateBenefits: s.updateBenefits,
      chatHistory: s.chatHistory,
      plannedProcedures: s.procedures,
      addChatMessage: s.addChatMessage,
      addProcedure: s.addProcedure,
    })),
  )
  const max = useAnnualMax()

  const state = useMemo<DentalState>(
    () => ({
      annualMax: max?.max ?? 0,
      used: max?.used ?? 0,
      pending: max?.pending ?? 0,
      selectedPlan: s.planName,
      procedureInput: s.procedureInput,
      aiAnalysis: s.aiAnalysis,
      setPlan: (plan) => {
        if (plan === 'sample') s.loadSamplePlan('preferred')
        else if (plan === 'high-option') s.loadSamplePlan('high-option')
        else if (plan) s.setManualPlan(plan)
        else s.reset()
      },
      setProcedure: s.setProcedureInput,
      setAiAnalysis: s.setAiAnalysis,
      updateBenefits: s.updateBenefits,
      chatHistory: s.chatHistory,
      plannedProcedures: s.plannedProcedures,
      addChatMessage: (message) => s.addChatMessage({ ...message, timestamp: message.timestamp ?? new Date().toISOString() }),
      addProcedure: s.addProcedure,
    }),
    [max, s],
  )
  return selector ? selector(state) : state
}
