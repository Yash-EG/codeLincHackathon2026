// The user's session: plan, benefits, planned procedures, the assistant's
// analysis and chat. Kept in
// sessionStorage only, so it survives reloads and room changes but disappears
// when the tab closes. Synthetic data only, nothing is sent to a server.

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CLAIMS, PROVIDERS, SAMPLE_PLANS, type SamplePlanId } from '../data/mockData'
import { daysUntil, formatUsd } from '../lib/format'
import { memberPlan, type Member } from '../lib/membersApi'
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

/** The demo user in db/migrations/V2: who the sample and typed-in plans price against. */
export const DEMO_MEMBER_ID = '1'

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

/** One turn of the "Decode your plan" chatbot. */
export interface DecodeChatMessage {
  sender: 'user' | 'assistant'
  text: string
  /** ISO 8601. */
  timestamp: string
  /** Where an assistant answer came from: the backend, or an error when it was unreachable. */
  source?: 'backend' | 'error'
}

/**
 * The Operatory "Explore a procedure" intake answers, kept so the chatbot can
 * include them as context on every follow-up message. Human-readable labels, not
 * codes, because they are sent to the assistant as plain-English context.
 */
export interface ExploreFormContext {
  /** Who the care is for, e.g. "Me (account owner)". */
  patient: string
  /** The chosen procedure label, e.g. "Crown". */
  procedure: string
  /** When it's needed, e.g. "Within 3 months". */
  timing: string
  /** Travel radius label, e.g. "Within 25 miles". */
  radius: string
  /** Search ZIP, e.g. "43215". */
  zip: string
}

export interface SessionData {
  /**
   * The database user the backend prices against (POST /api/analyze userId). "1" is the demo
   * user in db/migrations/V2; checking someone in at Reception sets it to their id.
   */
  memberId: string
  /**
   * Where the checked-in plan came from. "default" is the sample plan everyone starts with: when the
   * member database is reachable it is swapped for the demo employee's real plan (useDefaultMember),
   * so what the site shows is the plan the estimates are priced against.
   */
  planSource: 'default' | 'sample' | 'manual' | 'member'
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
  /** The Operatory intake answers, included as context on chatbot follow-ups ({@code null} until submitted). */
  exploreAnswers: ExploreFormContext | null
  /** Where to look for dentists: the ZIP and travel radius from the Explore form ("" until it's submitted). */
  searchZip: string
  searchRadiusMiles: number
  /** The assistant's read of the last procedure it priced. */
  aiAnalysis: AiAnalysis | null
  messages: ChatMessage[]
  /** The "Decode your plan" chatbot transcript. */
  chatHistory: DecodeChatMessage[]
}

interface SessionActions {
  /** Checks in one of the sample plans (default: Lincoln Preferred PPO). */
  loadSamplePlan: (id?: SamplePlanId) => void
  /** Checks in an employee from the member database (Reception's front desk). */
  checkInMember: (member: Member) => void
  setManualPlan: (input: ManualPlanInput) => void
  addProcedures: (requests: ProcedureRequest[]) => void
  /** Appends one planned procedure; care can be added one at a time after the plan is set. */
  addProcedure: (request: ProcedureRequest) => void
  removeProcedure: (requestId: string) => void
  /** Adds care to the next plan year. */
  deferToNextYear: (items: TreatmentPlanItem[]) => void
  removePlanItem: (itemId: string) => void
  /** Corrects the checked-in plan's annual maximum or the amount already used this year. */
  updateBenefits: (patch: { annualMax?: number; used?: number }) => void
  setProcedureInput: (text: string) => void
  setExploreAnswers: (answers: ExploreFormContext | null) => void
  setAiAnalysis: (analysis: AiAnalysis | null) => void
  setSearchLocation: (zip: string, radiusMiles: number) => void
  setNetwork: (network: NetworkTier) => void
  selectTooth: (toothNumber: number | null) => void
  appendMessage: (message: ChatMessage) => void
  addChatMessage: (message: DecodeChatMessage) => void
  /** Back to the default plan, with nothing planned. */
  reset: () => void
}

export type SessionState = SessionData & SessionActions

const EMPTY: SessionData = {
  memberId: DEMO_MEMBER_ID,
  planSource: 'manual',
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
  procedureInput: '',
  exploreAnswers: null,
  searchZip: '',
  searchRadiusMiles: 25,
  aiAnalysis: null,
  messages: [],
  chatHistory: [],
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

function sampleSession(id: SamplePlanId): SessionData {
  const sample = SAMPLE_PLANS[id]
  return {
    ...EMPTY,
    plan: sample.plan,
    tiers: sample.tiers,
    benefits: sample.benefits,
    claims: CLAIMS,
    translations: sample.translations,
    providers: PROVIDERS,
    messages: [greetingFor(sample.benefits)],
    planSource: 'sample',
  }
}

/** Everyone starts with a plan already loaded, so there's no setup step before the rest of the site. */
const DEFAULT_SESSION: SessionData = { ...sampleSession('preferred'), planSource: 'default' }

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...DEFAULT_SESSION,

      // Switching plans keeps where you're searching.
      loadSamplePlan: (id = 'preferred') =>
        set((s) => ({ ...sampleSession(id), searchZip: s.searchZip, searchRadiusMiles: s.searchRadiusMiles })),

      // A new patient at the desk: their plan and usage, nothing planned yet. The directory and
      // where you're searching stay.
      checkInMember: (member) =>
        set((s) => {
          const { plan, tiers, benefits } = memberPlan(member)
          return {
            ...EMPTY,
            memberId: member.id,
            planSource: 'member',
            plan,
            tiers,
            benefits,
            providers: PROVIDERS,
            messages: [greetingFor(benefits)],
            searchZip: s.searchZip,
            searchRadiusMiles: s.searchRadiusMiles,
          }
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
      addProcedure: (request) => set((s) => ({ procedures: [...s.procedures, request] })),
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
      setExploreAnswers: (exploreAnswers) => set({ exploreAnswers }),
      setAiAnalysis: (aiAnalysis) => set({ aiAnalysis }),
      setSearchLocation: (searchZip, searchRadiusMiles) => set({ searchZip, searchRadiusMiles }),
      setNetwork: (network) => set({ network }),
      selectTooth: (selectedTooth) => set({ selectedTooth }),
      appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      addChatMessage: (message) => set((s) => ({ chatHistory: [...s.chatHistory, message] })),
      reset: () => set(DEFAULT_SESSION),
    }),
    {
      name: 'molarity-session',
      // v8: the Operatory Explore answers are kept so the chatbot can include them as context.
      // v9: sessions record where their plan came from (planSource).
      // v8: sessions record which database member they price against (memberId).
      // v7: the Explore form's ZIP and radius are kept. v6: the directory adds Greensboro offices. v5: providers carry map coordinates. (v4: a default plan is loaded up front and the decode
      // chatbot keeps a transcript.) Older sessions start over.
      version: 9,
      migrate: () => DEFAULT_SESSION as SessionState,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
