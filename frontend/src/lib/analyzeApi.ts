// Client for the cost-estimate / in-vs-out-of-network analyzer
// (backend: POST /api/analyze -> AnalysisResponse).
//
// This is the client for the real backend analyzer. It sends the
// user's free text to the Spring Boot analyzer, which uses Bedrock to interpret
// intent, loads TRUSTED plan/coverage/usage from Neon, prices the procedure
// in- and out-of-network with Jay's calculator, and returns structured
// estimates (never AI-invented numbers) plus optional treatment-timing guidance.
//
// The backend response shapes are mirrored verbatim from the Java DTOs:
//   AnalysisResponse  (dto/AnalysisResponse.java)
//   BenefitEstimate   (dto/BenefitEstimate.java)  -> money fields match CostEstimate
//   TimingGuidance    (dto/TimingGuidance.java)
//
// On any network/HTTP error we throw, and the caller (useAssistant) shows the failure.

import type {
  AiAnalysis,
  CdtProcedure,
  CoverageClass,
  CostEstimate,
  CostLineItem,
  NetworkTier,
  ProcedureRequest,
  SequenceStep,
} from '../types/domain'
import { apiFetch, errorMessage } from './apiError'

// --- Backend DTO mirrors ----------------------------------------------------

/** Mirrors AnalysisResponse.Kind. */
export type AnalysisKind = 'ESTIMATE' | 'CLARIFICATION'

/** Mirrors dto/BenefitEstimate.java. Money fields are numbers (JSON) here. */
export interface BackendBenefitEstimate {
  cdtCode: string
  procedureName: string
  toothNumber: number | null
  networkTier: NetworkTier
  fee: number
  allowed: number
  planPays: number
  patientPays: number
  deductibleApplied: number
  overMaximum: number
  remainingBenefit: number | null
  explanation: string | null
}

/** Mirrors dto/TimingGuidance.java. */
export interface BackendTimingGuidance {
  benefitYear: number
  benefitYearEnd: string
  remainingMaximumThisYear: number
  amountOverMaximumThisYear: number
  message: string
}

/** Mirrors dto/AnalysisResponse.java. */
export interface AnalysisResponse {
  kind: AnalysisKind
  estimates: BackendBenefitEstimate[]
  summary: string | null
  clarificationQuestion: string | null
  timing: BackendTimingGuidance | null
}

/** Mirrors dto/AnalyzeRequest.java. */
export interface AnalyzeRequest {
  userId: string
  message: string
}

/** The analyzer result adapted to the UI's existing shapes. */
export interface AnalyzeResult {
  kind: AnalysisKind
  /** Plain-English content to show in the chat (summary + timing, or the clarification question). */
  content: string
  /** One folded line item per procedure (both networks), ready for the cost breakdown. */
  lineItems: CostLineItem[]
  /** Procedures the analyzer priced, so the store can add them to the plan. */
  requests: ProcedureRequest[]
  /** The analyzer's read of the question, when it produced estimates; null for a clarification. */
  analysis: AiAnalysis | null
  /** Optional timing guidance, passed through for any UI that wants to show it. */
  timing: BackendTimingGuidance | null
}

// --- API call ---------------------------------------------------------------

/**
 * Ask the backend analyzer. Throws on any network/HTTP error so the caller can
 * show it. The Vite dev server proxies /api -> :8080.
 */
export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResult> {
  const res = await apiFetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  // The backend's own message (database off, Bedrock unavailable, ...) is what the chat shows.
  if (!res.ok) throw new Error(await errorMessage(res))
  const data = (await res.json()) as AnalysisResponse
  return adaptAnalysis(data)
}

// --- Mapping backend -> UI shapes -------------------------------------------

/** Adapt a raw AnalysisResponse into the UI's AnalyzeResult. */
export function adaptAnalysis(data: AnalysisResponse): AnalyzeResult {
  if (data.kind === 'CLARIFICATION') {
    return {
      kind: 'CLARIFICATION',
      content:
        data.clarificationQuestion ??
        'Could you tell me a bit more about the procedure you have in mind?',
      lineItems: [],
      requests: [],
      analysis: null,
      timing: null,
    }
  }

  const lineItems = foldEstimatesToLineItems(data.estimates)
  const requests: ProcedureRequest[] = lineItems.map((li) => li.request)

  // Prefer the backend's own plain-English explanation; fall back to summary.
  const explanation =
    data.estimates.find((e) => e.explanation)?.explanation ??
    data.summary ??
    'Here is your in- and out-of-network estimate.'

  const content = data.timing
    ? `${explanation}\n\n${data.timing.message}`
    : explanation

  return {
    kind: 'ESTIMATE',
    content,
    lineItems,
    requests,
    analysis: buildAiAnalysis(lineItems, explanation, data.timing),
    timing: data.timing,
  }
}

/**
 * The coverage class for a CDT code, by the CDT category ranges, matching how
 * the database classes its procedures (db/migrations/V2: exams, X-rays and
 * cleanings preventive; fillings, deep cleanings and extractions basic; root
 * canals, crowns and implants major). The estimate DTO carries no category, and
 * the UI labels and waiting periods read this, so it must not be a constant.
 */
export function coverageClassForCdt(cdtCode: string): CoverageClass {
  const n = Number.parseInt(cdtCode.replace(/^D/i, ''), 10)
  if (!Number.isFinite(n)) return 'BASIC'
  if (n < 2000) return 'PREVENTIVE' // D0 diagnostic, D1 preventive
  if (n < 2400) return 'BASIC' // D2000-D2399 fillings
  if (n < 3000) return 'MAJOR' // D2400-D2999 inlays, onlays, crowns
  if (n < 4000) return 'MAJOR' // D3 endodontics (root canals)
  if (n < 5000) return 'BASIC' // D4 periodontics (deep cleaning)
  if (n < 7000) return 'MAJOR' // D5 removable and D6 implant/fixed prosthodontics
  if (n < 8000) return 'BASIC' // D7 oral surgery (extractions)
  if (n < 9000) return 'ORTHODONTIC' // D8
  return 'BASIC' // D9 adjunctive
}

/**
 * Fold the backend's flat list of per-network estimates into the UI's
 * CostLineItem shape (one item per procedure, with both networks under
 * `byNetwork`). The backend money fields already match CostEstimate.
 */
function foldEstimatesToLineItems(estimates: BackendBenefitEstimate[]): CostLineItem[] {
  // Group by procedure identity (cdtCode + tooth), preserving first-seen order.
  const order: string[] = []
  const groups = new Map<string, BackendBenefitEstimate[]>()
  for (const e of estimates) {
    const key = `${e.cdtCode}#${e.toothNumber ?? ''}`
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(e)
  }

  return order.map((key) => {
    const group = groups.get(key)!
    const inEst = group.find((e) => e.networkTier === 'IN_NETWORK') ?? group[0]
    const outEst = group.find((e) => e.networkTier === 'OUT_OF_NETWORK') ?? group[0]

    const request: ProcedureRequest = {
      id: key,
      cdtCode: inEst.cdtCode,
      toothNumber: inEst.toothNumber,
    }

    // Minimal CdtProcedure derived from the estimate (the backend owns the
    // authoritative catalog; the UI only needs identity + fees for display).
    const procedure: CdtProcedure = {
      cdtCode: inEst.cdtCode,
      shortName: inEst.procedureName,
      plainDescription: inEst.explanation ?? '',
      coverageClass: coverageClassForCdt(inEst.cdtCode),
      isCovered: true,
      isToothSpecific: inEst.toothNumber != null,
      inNetworkFee: inEst.fee,
      ucrFee: outEst.fee,
    }

    const byNetwork: Record<NetworkTier, CostEstimate> = {
      IN_NETWORK: toCostEstimate(inEst),
      OUT_OF_NETWORK: toCostEstimate(outEst),
    }

    // Derive plan-pays % from the numbers (allowed - deductible) so the UI can
    // show it without a separate field on the backend DTO.
    const planPaysPct: Record<NetworkTier, number> = {
      IN_NETWORK: impliedPct(inEst),
      OUT_OF_NETWORK: impliedPct(outEst),
    }

    return { request, procedure, planPaysPct, byNetwork }
  })
}

function toCostEstimate(e: BackendBenefitEstimate): CostEstimate {
  return {
    fee: e.fee,
    allowed: e.allowed,
    planPays: e.planPays,
    patientPays: e.patientPays,
    deductibleApplied: e.deductibleApplied,
    overMaximum: e.overMaximum,
  }
}

/** Best-effort coinsurance % implied by the estimate, for display only. */
function impliedPct(e: BackendBenefitEstimate): number {
  const base = e.allowed - e.deductibleApplied
  if (base <= 0) return 0
  // planPays may be capped by the annual max; add back overMaximum to recover
  // the pre-cap coinsurance the plan intended to pay.
  const intendedPlanPays = e.planPays + e.overMaximum
  return Math.round((intendedPlanPays / base) * 100)
}

/** Build the AiAnalysis the UI shows for an estimate result. */
function buildAiAnalysis(
  lineItems: CostLineItem[],
  explanation: string,
  timing: BackendTimingGuidance | null,
): AiAnalysis {
  const sum = (net: NetworkTier, pick: (e: CostEstimate) => number) =>
    lineItems.reduce((acc, li) => acc + pick(li.byNetwork[net]), 0)

  const estimatedCost = sum('IN_NETWORK', (e) => e.fee)
  const inNetworkCost = sum('IN_NETWORK', (e) => e.patientPays)
  const outOfNetworkCost = sum('OUT_OF_NETWORK', (e) => e.patientPays)

  const suggestedSequence: SequenceStep[] = lineItems.map((li, i) => ({
    step: i + 1,
    label: li.procedure.shortName + (li.request.toothNumber ? ` on tooth #${li.request.toothNumber}` : ''),
    timing: 'this-year',
    youPay: li.byNetwork.IN_NETWORK.patientPays,
    reason: 'Priced from your plan’s in-network coverage.',
  }))

  return {
    simplifiedExplanation: explanation,
    estimatedCost,
    inNetworkCost,
    outOfNetworkCost,
    suggestedSequence,
    // Savings: plan payment that would be recovered by deferring work past the reset.
    savings: timing?.amountOverMaximumThisYear ?? 0,
  }
}
