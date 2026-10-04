// Frontend mirrors of the Neon schema (db/migrations/V1__schema.sql).
// Field names are the camelCase of the SQL columns so the Spring Boot DTOs
// can serialize straight into these shapes.

export type CoverageClass = 'PREVENTIVE' | 'BASIC' | 'MAJOR' | 'ORTHODONTIC'
export type NetworkTier = 'IN_NETWORK' | 'OUT_OF_NETWORK'
export type TreatmentStatus = 'PROPOSED' | 'SCHEDULED' | 'COMPLETED' | 'DEFERRED'
export type Urgency = 'URGENT' | 'SOON' | 'ELECTIVE'

/** Visual state of a tooth in the 3D arch. */
export type ToothStatus = 'planned' | 'treated'

export interface InsurancePlan {
  id: string
  carrierName: string
  planName: string
  planType: 'PPO' | 'DHMO' | 'INDEMNITY' | 'EPO'
  annualMaximum: number
  deductibleIndividualIn: number
  deductibleIndividualOut: number
  rolloverEnabled: boolean
  /** Fraction of the UCR fee the plan allows out-of-network (e.g. UCR_80 ≈ 0.8). */
  oonAllowedRatio: number
  summaryOfBenefits: string
}

/** Row of plan_coverage_tiers. */
export interface CoverageTier {
  coverageClass: CoverageClass
  planPaysPctInNetwork: number
  planPaysPctOutNetwork: number
  deductibleApplies: boolean
  waitingPeriodMonths: number
}

/** Row of v_plan_procedure_coverage for one plan + region. */
export interface CdtProcedure {
  cdtCode: string
  shortName: string
  plainDescription: string
  coverageClass: CoverageClass
  isCovered: boolean
  isToothSpecific: boolean
  /** Frequency limit per benefit year (frequency_count where frequency_months = 12). */
  frequencyPerYear?: number
  inNetworkFee: number
  ucrFee: number
}

/** Row of v_enrollment_benefit_summary. */
export interface BenefitSummary {
  enrollmentId: string
  fullName: string
  carrierName: string
  planName: string
  planYearStart: string
  planYearEnd: string
  annualMaximum: number
  rolloverBalance: number
  effectiveMaximum: number
  usedToDate: number
  plannedPlanPays: number
  remainingMaximum: number
  deductible: number
  deductibleMet: number
  deductibleRemaining: number
  daysRemaining: number
  benefitsExpiringSoon: boolean
}

/** Row of benefit_claims (trimmed). */
export interface BenefitClaim {
  cdtCode: string
  toothNumber: number | null
  serviceDate: string
  planPaid: number
  patientPaid: number
}

/** Row of treatment_plan_items. */
export interface TreatmentPlanItem {
  id: string
  cdtCode: string
  toothNumber: number | null
  surfaces: string | null
  status: TreatmentStatus
  urgency: Urgency
  recommendedDate: string
  sequenceOrder: number
  aiRationale: string
}

/** A procedure the user is considering (input to the estimator). */
export interface ProcedureRequest {
  id: string
  cdtCode: string
  toothNumber: number | null
  surfaces?: string
  recommendedDate?: string
}

export interface CostEstimate {
  fee: number
  allowed: number
  planPays: number
  patientPays: number
  deductibleApplied: number
  /** Plan payment lost because the annual maximum ran out. */
  overMaximum: number
}

/** One line of the cost breakdown, estimated both in- and out-of-network. */
export interface CostLineItem {
  request: ProcedureRequest
  procedure: CdtProcedure
  planPaysPct: Record<NetworkTier, number>
  byNetwork: Record<NetworkTier, CostEstimate>
}

/** Dense plan language and its plain-English translation (Bedrock output). */
export interface JargonTranslation {
  id: string
  topic: string
  planText: string
  plainEnglish: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toothNumber?: number | null
  lineItems?: CostLineItem[]
}

/** One step of the order the assistant suggests doing care in. */
export interface SequenceStep {
  step: number
  /** e.g. "Root canal, molar on tooth #14". */
  label: string
  /** This plan year, or after the maximum and deductible reset. */
  timing: 'this-year' | 'next-year'
  /** When to book it (ISO date), if the assistant suggests one. */
  date?: string
  /** What you'd pay in-network for this step. */
  youPay: number
  reason: string
}

/** The assistant's read of the procedure the user described (Bedrock output, mocked offline). */
export interface AiAnalysis {
  /** The procedure in plain English. */
  simplifiedExplanation: string
  /** Full in-network price before insurance, all steps. */
  estimatedCost: number
  /** What you'd pay with an in-network dentist, in the suggested order. */
  inNetworkCost: number
  /** What you'd pay with an out-of-network dentist, in the suggested order. */
  outOfNetworkCost: number
  suggestedSequence: SequenceStep[]
  /** How much the suggested order saves compared with doing everything this plan year. */
  savings: number
}
