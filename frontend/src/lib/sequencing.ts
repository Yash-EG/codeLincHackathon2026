// When to get care: doing everything this plan year versus moving some of it
// past Jan 1, when the annual maximum and the deductible reset.
//
// The sample plan's story: $1,100 of the $1,500 maximum is left. The root canal
// on #14 uses $728 of it, so a crown this year only gets the last $372. After
// Jan 1 a fresh maximum pays $687 of the same crown (50% after a new $50
// deductible), so splitting the work across the reset saves $315.

import type { InsurancePlan, NetworkTier, ProcedureRequest, TreatmentPlanItem } from '../types/domain'
import { estimateProcedures, totalsFor, type EstimateContext } from './estimate'
import { roundCents } from './format'

export interface TimingComparison {
  /** What you pay if the later care is done this plan year too. */
  allNowPays: number
  /** What you pay if it waits for the next plan year. */
  splitPays: number
  /** allNowPays - splitPays (negative when waiting costs more, e.g. a second deductible). */
  savings: number
}

/** The estimate context on Jan 1: a fresh maximum (no rollover assumed) and a fresh deductible. */
export function nextYearContext(ctx: EstimateContext, plan: InsurancePlan): EstimateContext {
  return {
    ...ctx,
    remainingMaximum: plan.annualMaximum,
    deductibleRemaining: { IN_NETWORK: plan.deductibleIndividualIn, OUT_OF_NETWORK: plan.deductibleIndividualOut },
  }
}

/**
 * Prices `later` two ways: straight after `now` in this plan year, or in the next
 * plan year after `alreadyNextYear` (care already moved there). `now` is
 * everything planned for this year and is priced first in both cases.
 */
export function compareTiming(
  now: ProcedureRequest[],
  later: ProcedureRequest[],
  thisYear: EstimateContext,
  nextYear: EstimateContext,
  alreadyNextYear: ProcedureRequest[] = [],
  network: NetworkTier = 'IN_NETWORK',
): TimingComparison {
  const pays = (requests: ProcedureRequest[], ctx: EstimateContext) =>
    totalsFor(estimateProcedures(requests, ctx), network).patientPays
  const allNowPays = pays([...now, ...later], thisYear)
  const laterNextYear = pays([...alreadyNextYear, ...later], nextYear) - pays(alreadyNextYear, nextYear)
  const splitPays = roundCents(pays(now, thisYear) + laterNextYear)
  return { allNowPays, splitPays, savings: roundCents(allNowPays - splitPays) }
}

/** Treatment-plan items as estimator input. */
export function toRequests(items: TreatmentPlanItem[]): ProcedureRequest[] {
  return [...items]
    .sort((a, b) => a.recommendedDate.localeCompare(b.recommendedDate) || a.sequenceOrder - b.sequenceOrder)
    .map((item) => ({
      id: item.id,
      cdtCode: item.cdtCode,
      toothNumber: item.toothNumber,
      surfaces: item.surfaces ?? undefined,
      recommendedDate: item.recommendedDate,
    }))
}

/** A booking date early in the next plan year (planYearEnd + `days`), as an ISO date. */
export function earlyNextYear(planYearEnd: string, days = 12): string {
  const end = new Date(`${planYearEnd}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + days)
  return end.toISOString().slice(0, 10)
}
