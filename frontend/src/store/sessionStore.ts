// The user's session: plan, benefits, planned procedures and chat. Kept in
// sessionStorage only, so it survives reloads and room changes but disappears
// when the tab closes. Synthetic data only, nothing is sent to a server.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  BENEFIT_SUMMARY,
  CLAIMS,
  COVERAGE_TIERS,
  JARGON_TRANSLATIONS,
  PLAN,
  TREATMENT_PLAN,
} from '../data/mockData'
import { daysUntil, formatUsd } from '../lib/format'
import type {
  BenefitClaim,
  BenefitSummary,
  ChatMessage,
  CoverageClass,
  CoverageTier,
  InsurancePlan,
  JargonTranslation,
  NetworkTier,
  ProcedureRequest,
  TreatmentPlanItem,
} from '../types/domain'

/** What the Reception check-in form collects when the user types in their own plan. */
export interface ManualPlanInput {
  carrierName: string
  planName: string
  annualMaximum: number
  deductible: number
  usedToDate: number
  planYearEnd: string
  preventivePct: number
  basicPct: number
  majorPct: number
}

export interface SessionData {
  plan: InsurancePlan | null
  tiers: Record<CoverageClass, CoverageTier> | null
  benefits: BenefitSummary | null
  claims: BenefitClaim[]
  /** The AI-sequenced plan, including items already pushed into the next plan year. */
  treatmentPlan: TreatmentPlanItem[]
  /** Procedures being priced for this plan year (the cost breakdown). */
  procedures: ProcedureRequest[]
  translations: JargonTranslation[]
  network: NetworkTier
  selectedTooth: number | null
  messages: ChatMessage[]
}

interface SessionActions {
  loadSamplePlan: () => void
  setManualPlan: (input: ManualPlanInput) => void
  addProcedures: (requests: ProcedureRequest[]) => void
  removeProcedure: (requestId: string) => void
  setNetwork: (network: NetworkTier) => void
  selectTooth: (toothNumber: number | null) => void
  appendMessage: (message: ChatMessage) => void
  reset: () => void
}

export type SessionState = SessionData & SessionActions

const EMPTY: SessionData = {
  plan: null,
  tiers: null,
  benefits: null,
  claims: [],
  treatmentPlan: [],
  procedures: [],
  translations: [],
  network: 'IN_NETWORK',
  selectedTooth: null,
  messages: [],
}

function greetingFor(benefits: BenefitSummary): ChatMessage {
  const firstName = benefits.fullName.split(' ')[0]
  return {
    id: 'greeting',
    role: 'assistant',
    content:
      `Hi ${firstName}. I've loaded your ${benefits.planName} benefits: ` +
      `${formatUsd(benefits.remainingMaximum)} of your ${formatUsd(benefits.effectiveMaximum)} maximum is left, ` +
      `and it resets in ${benefits.daysRemaining} days. Pick a tooth or describe what your dentist recommended, ` +
      `and I'll show what insurance covers and what you'd pay.`,
  }
}

/** Treatment-plan items inside the current plan year seed the cost breakdown. */
function requestsForPlanYear(plan: TreatmentPlanItem[], planYearEnd: string): ProcedureRequest[] {
  return plan
    .filter((item) => item.recommendedDate <= planYearEnd)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((item) => ({
      id: item.id,
      cdtCode: item.cdtCode,
      toothNumber: item.toothNumber,
      surfaces: item.surfaces ?? undefined,
      recommendedDate: item.recommendedDate,
    }))
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,

      loadSamplePlan: () =>
        set({
          ...EMPTY,
          plan: PLAN,
          tiers: COVERAGE_TIERS,
          benefits: BENEFIT_SUMMARY,
          claims: CLAIMS,
          treatmentPlan: TREATMENT_PLAN,
          procedures: requestsForPlanYear(TREATMENT_PLAN, BENEFIT_SUMMARY.planYearEnd),
          translations: JARGON_TRANSLATIONS,
          messages: [greetingFor(BENEFIT_SUMMARY)],
        }),

      setManualPlan: (input) => {
        // A plan year ends on planYearEnd and starts the day after the same date a year earlier.
        const end = new Date(`${input.planYearEnd}T00:00:00Z`)
        const planYearStart = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate() + 1))
          .toISOString()
          .slice(0, 10)
        const daysRemaining = daysUntil(input.planYearEnd)
        const remainingMaximum = Math.max(input.annualMaximum - input.usedToDate, 0)
        const tier = (coverageClass: CoverageClass, pct: number, deductibleApplies: boolean): CoverageTier => ({
          coverageClass,
          planPaysPctInNetwork: pct,
          // Without plan documents, assume out-of-network pays 10 points less (never below 0).
          planPaysPctOutNetwork: coverageClass === 'PREVENTIVE' ? pct : Math.max(pct - 10, 0),
          deductibleApplies,
          waitingPeriodMonths: 0,
        })
        const plan: InsurancePlan = {
          id: 'manual-plan',
          carrierName: input.carrierName,
          planName: input.planName,
          planType: 'PPO',
          annualMaximum: input.annualMaximum,
          deductibleIndividualIn: input.deductible,
          deductibleIndividualOut: input.deductible * 2,
          rolloverEnabled: false,
          oonAllowedRatio: 0.8,
          summaryOfBenefits: '',
        }
        const benefits: BenefitSummary = {
          enrollmentId: 'manual-enrollment',
          fullName: 'You',
          carrierName: input.carrierName,
          planName: input.planName,
          planYearStart,
          planYearEnd: input.planYearEnd,
          annualMaximum: input.annualMaximum,
          rolloverBalance: 0,
          effectiveMaximum: input.annualMaximum,
          usedToDate: input.usedToDate,
          plannedPlanPays: 0,
          remainingMaximum,
          deductible: input.deductible,
          deductibleMet: 0,
          deductibleRemaining: input.deductible,
          daysRemaining,
          benefitsExpiringSoon: daysRemaining <= 90 && remainingMaximum > 0,
        }
        set({
          ...EMPTY,
          plan,
          benefits,
          tiers: {
            PREVENTIVE: tier('PREVENTIVE', input.preventivePct, false),
            BASIC: tier('BASIC', input.basicPct, true),
            MAJOR: tier('MAJOR', input.majorPct, true),
            ORTHODONTIC: tier('ORTHODONTIC', 0, false),
          },
          messages: [greetingFor(benefits)],
        })
      },

      addProcedures: (requests) => set((s) => ({ procedures: [...s.procedures, ...requests] })),
      removeProcedure: (requestId) => set((s) => ({ procedures: s.procedures.filter((r) => r.id !== requestId) })),
      setNetwork: (network) => set({ network }),
      selectTooth: (selectedTooth) => set({ selectedTooth }),
      appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      reset: () => set(EMPTY),
    }),
    {
      name: 'molarity-session',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
