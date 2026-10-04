// The user's session: plan, benefits, planned procedures, the assistant's
// analysis and chat. Kept in
// sessionStorage only, so it survives reloads and room changes but disappears
// when the tab closes. Synthetic data only, nothing is sent to a server.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CLAIMS, PROVIDERS, SAMPLE_PLANS, SAMPLE_PROCEDURE_INPUT, type SamplePlanId } from '../data/mockData'
import { daysUntil, formatUsd } from '../lib/format'
import type {
  AiAnalysis,
  BenefitClaim,
  BenefitSummary,
  ChatMessage,
  CoverageClass,
  CoverageTier,
  InsurancePlan,
  JargonTranslation,
  NetworkTier,
  ProcedureRequest,
  Provider,
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
  /** Care the assistant moved into the next plan year (after the maximum and deductible reset). */
  treatmentPlan: TreatmentPlanItem[]
  /** Procedures being priced for this plan year (the cost breakdown). */
  procedures: ProcedureRequest[]
  translations: JargonTranslation[]
  /** In-network and nearby out-of-network dentists for the checked-in plan (none for typed-in plans). */
  providers: Provider[]
  network: NetworkTier
  selectedTooth: number | null
  /** What the user typed in "Describe your care". */
  procedureInput: string
  /** The assistant's read of the last procedure it priced. */
  aiAnalysis: AiAnalysis | null
  messages: ChatMessage[]
}

interface SessionActions {
  /** Checks in one of the sample plans (default: Lincoln Preferred PPO). */
  loadSamplePlan: (id?: SamplePlanId) => void
  setManualPlan: (input: ManualPlanInput) => void
  addProcedures: (requests: ProcedureRequest[]) => void
  removeProcedure: (requestId: string) => void
  /** Adds care to the next plan year. */
  deferToNextYear: (items: TreatmentPlanItem[]) => void
  removePlanItem: (itemId: string) => void
  /** Corrects the checked-in plan's annual maximum or the amount already used this year. */
  updateBenefits: (patch: { annualMax?: number; used?: number }) => void
  setProcedureInput: (text: string) => void
  setAiAnalysis: (analysis: AiAnalysis | null) => void
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
  providers: [],
  network: 'IN_NETWORK',
  selectedTooth: null,
  procedureInput: SAMPLE_PROCEDURE_INPUT,
  aiAnalysis: null,
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
      `and it resets in ${benefits.daysRemaining} days. Describe what your dentist recommended or pick a tooth, ` +
      `and I'll show what insurance covers and what you'd pay.`,
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,

      loadSamplePlan: (id = 'preferred') => {
        const sample = SAMPLE_PLANS[id]
        set({
          ...EMPTY,
          plan: sample.plan,
          tiers: sample.tiers,
          benefits: sample.benefits,
          claims: CLAIMS,
          translations: sample.translations,
          providers: PROVIDERS,
          messages: [greetingFor(sample.benefits)],
        })
      },

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
      deferToNextYear: (items) => set((s) => ({ treatmentPlan: [...s.treatmentPlan, ...items] })),
      removePlanItem: (itemId) => set((s) => ({ treatmentPlan: s.treatmentPlan.filter((t) => t.id !== itemId) })),
      updateBenefits: ({ annualMax, used }) =>
        set((s) => {
          if (!s.plan || !s.benefits) return {}
          const annualMaximum = annualMax ?? s.benefits.annualMaximum
          const usedToDate = used ?? s.benefits.usedToDate
          const effectiveMaximum = annualMaximum + s.benefits.rolloverBalance
          const remainingMaximum = Math.max(effectiveMaximum - usedToDate, 0)
          return {
            plan: { ...s.plan, annualMaximum },
            benefits: {
              ...s.benefits,
              annualMaximum,
              effectiveMaximum,
              usedToDate,
              remainingMaximum,
              benefitsExpiringSoon: s.benefits.daysRemaining <= 90 && remainingMaximum > 0,
            },
          }
        }),
      setProcedureInput: (procedureInput) => set({ procedureInput }),
      setAiAnalysis: (aiAnalysis) => set({ aiAnalysis }),
      setNetwork: (network) => set({ network }),
      selectTooth: (selectedTooth) => set({ selectedTooth }),
      appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      reset: () => set(EMPTY),
    }),
    {
      name: 'molarity-session',
      // v3: adds the provider directory. Older sessions start over.
      version: 3,
      migrate: () => EMPTY as SessionState,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
