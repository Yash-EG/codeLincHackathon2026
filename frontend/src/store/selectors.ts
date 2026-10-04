// Derived values. Line items and totals are never stored: they are recomputed
// from the session with the same estimator the assistant uses.

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PROCEDURES } from '../data/mockData'
import { estimateProcedures, totalsFor, type EstimateContext } from '../lib/estimate'
import { formatShortDate } from '../lib/format'
import { compareTiming, nextYearContext, toRequests, type TimingComparison } from '../lib/sequencing'
import type { CostLineItem, NetworkTier, ToothStatus } from '../types/domain'
import type { ToothHistoryEntry } from '../components/ToothInspector'
import { useSessionStore, type SessionData } from './sessionStore'

export function buildEstimateContext(s: Pick<SessionData, 'plan' | 'tiers' | 'benefits'>): EstimateContext | null {
  if (!s.plan || !s.tiers || !s.benefits) return null
  return {
    procedures: PROCEDURES,
    tiers: s.tiers,
    oonAllowedRatio: s.plan.oonAllowedRatio,
    deductibleRemaining: {
      IN_NETWORK: s.benefits.deductibleRemaining,
      OUT_OF_NETWORK: Math.max(s.plan.deductibleIndividualOut - s.benefits.deductibleMet, 0),
    },
    remainingMaximum: s.benefits.remainingMaximum,
  }
}

export function useLineItems(): CostLineItem[] {
  const { plan, tiers, benefits, procedures } = useSessionStore(
    useShallow((s) => ({ plan: s.plan, tiers: s.tiers, benefits: s.benefits, procedures: s.procedures })),
  )
  return useMemo(() => {
    const ctx = buildEstimateContext({ plan, tiers, benefits })
    return ctx ? estimateProcedures(procedures, ctx) : []
  }, [plan, tiers, benefits, procedures])
}

export function useTotals(network: NetworkTier) {
  const items = useLineItems()
  return useMemo(() => totalsFor(items, network), [items, network])
}

export interface NextYearPlan {
  /** Care moved past the reset, priced against next year's fresh maximum and deductible. */
  items: CostLineItem[]
  /** This year's care plus that care, all now versus split across Jan 1. */
  timing: TimingComparison
}

export function useNextYearPlan(): NextYearPlan | null {
  const { plan, tiers, benefits, procedures, treatmentPlan } = useSessionStore(
    useShallow((s) => ({
      plan: s.plan,
      tiers: s.tiers,
      benefits: s.benefits,
      procedures: s.procedures,
      treatmentPlan: s.treatmentPlan,
    })),
  )
  return useMemo(() => {
    const ctx = buildEstimateContext({ plan, tiers, benefits })
    if (!ctx || !plan || !benefits) return null
    const later = toRequests(treatmentPlan.filter((t) => t.recommendedDate > benefits.planYearEnd))
    const next = nextYearContext(ctx, plan)
    return { items: estimateProcedures(later, next), timing: compareTiming(procedures, later, ctx, next) }
  }, [plan, tiers, benefits, procedures, treatmentPlan])
}

export interface AnnualMax {
  year: string
  max: number
  /** Paid by claims so far this plan year. */
  used: number
  /** Insurance payments the current plan would use (in-network). */
  pending: number
  left: number
  /** Insurance payments the plan wants but the maximum can't cover. */
  overMaximum: number
  planYearEnd: string
  daysRemaining: number
}

export function useAnnualMax(): AnnualMax | null {
  const benefits = useSessionStore((s) => s.benefits)
  const inNetwork = useTotals('IN_NETWORK')
  return useMemo(() => {
    if (!benefits) return null
    const max = benefits.effectiveMaximum
    const used = Math.min(benefits.usedToDate, max)
    const pending = Math.min(inNetwork.planPays, Math.max(max - used, 0))
    return {
      year: benefits.planYearStart.slice(0, 4),
      max,
      used,
      pending,
      left: Math.max(max - used - pending, 0),
      overMaximum: inNetwork.overMaximum,
      planYearEnd: benefits.planYearEnd,
      daysRemaining: benefits.daysRemaining,
    }
  }, [benefits, inNetwork])
}

/** Tooth colors on the map: treated this year (claims) or care planned (breakdown). */
export function useToothStatus(): Partial<Record<number, ToothStatus>> {
  const { claims, procedures } = useSessionStore(useShallow((s) => ({ claims: s.claims, procedures: s.procedures })))
  return useMemo(() => {
    const status: Partial<Record<number, ToothStatus>> = {}
    for (const claim of claims) if (claim.toothNumber != null) status[claim.toothNumber] = 'treated'
    for (const request of procedures) if (request.toothNumber != null) status[request.toothNumber] = 'planned'
    return status
  }, [claims, procedures])
}

export function useToothHistory(toothNumber: number | null): ToothHistoryEntry[] {
  const claims = useSessionStore((s) => s.claims)
  const lineItems = useLineItems()
  return useMemo(() => {
    if (toothNumber == null) return []
    return [
      ...claims
        .filter((c) => c.toothNumber === toothNumber)
        .map((c) => ({
          kind: 'treated' as const,
          label: PROCEDURES[c.cdtCode]?.shortName ?? c.cdtCode,
          detail: formatShortDate(c.serviceDate),
        })),
      ...lineItems
        .filter((li) => li.request.toothNumber === toothNumber)
        .map((li) => ({
          kind: 'planned' as const,
          label: li.procedure.shortName,
          detail: li.request.recommendedDate ? formatShortDate(li.request.recommendedDate) : 'Not scheduled',
        })),
    ]
  }, [claims, lineItems, toothNumber])
}
