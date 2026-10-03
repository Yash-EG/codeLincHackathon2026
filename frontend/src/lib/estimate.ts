// Client-side cost estimator used by the mock assistant and the breakdown panel.
// The Spring Boot service will own this logic (with waiting periods and
// frequency limits); this mirrors the core rules so the demo math is honest:
//   1. In-network: fee = negotiated fee. Out-of-network: fee = UCR fee, and the
//      plan only "allows" a percentile of it — the rest is balance-billed.
//   2. Deductible comes off the allowed amount first (if the class applies it).
//   3. Plan pays its coinsurance % of what remains...
//   4. ...but never more than what is left of the annual maximum.

import type {
  CdtProcedure,
  CostEstimate,
  CostLineItem,
  CoverageClass,
  CoverageTier,
  NetworkTier,
  ProcedureRequest,
} from '../types/domain'
import { roundCents } from './format'

export interface EstimateContext {
  procedures: Record<string, CdtProcedure>
  tiers: Record<CoverageClass, CoverageTier>
  oonAllowedRatio: number
  deductibleRemaining: Record<NetworkTier, number>
  /** Annual maximum still available before these requests. */
  remainingMaximum: number
}

const NETWORKS: NetworkTier[] = ['IN_NETWORK', 'OUT_OF_NETWORK']

/**
 * Estimates a sequence of procedures in order, carrying the deductible and
 * the remaining annual maximum from one line to the next (per network, so the
 * two columns are independent "what if everything went in/out-of-network" scenarios).
 */
export function estimateProcedures(requests: ProcedureRequest[], ctx: EstimateContext): CostLineItem[] {
  const running: Record<NetworkTier, { deductible: number; maximum: number }> = {
    IN_NETWORK: { deductible: ctx.deductibleRemaining.IN_NETWORK, maximum: ctx.remainingMaximum },
    OUT_OF_NETWORK: { deductible: ctx.deductibleRemaining.OUT_OF_NETWORK, maximum: ctx.remainingMaximum },
  }

  return requests.flatMap((request) => {
    const procedure = ctx.procedures[request.cdtCode]
    if (!procedure) return []
    const tier = ctx.tiers[procedure.coverageClass]

    const planPaysPct: Record<NetworkTier, number> = {
      IN_NETWORK: procedure.isCovered ? tier.planPaysPctInNetwork : 0,
      OUT_OF_NETWORK: procedure.isCovered ? tier.planPaysPctOutNetwork : 0,
    }

    const byNetwork = Object.fromEntries(
      NETWORKS.map((network) => {
        const state = running[network]
        const fee = network === 'IN_NETWORK' ? procedure.inNetworkFee : procedure.ucrFee
        const allowed =
          network === 'IN_NETWORK' ? fee : roundCents(procedure.ucrFee * ctx.oonAllowedRatio)

        const deductibleApplied =
          procedure.isCovered && tier.deductibleApplies ? Math.min(state.deductible, allowed) : 0
        const uncapped = roundCents(((allowed - deductibleApplied) * planPaysPct[network]) / 100)
        const planPays = Math.min(uncapped, state.maximum)

        state.deductible -= deductibleApplied
        state.maximum = roundCents(state.maximum - planPays)

        const estimate: CostEstimate = {
          fee,
          allowed,
          planPays,
          patientPays: roundCents(fee - planPays),
          deductibleApplied,
          overMaximum: roundCents(uncapped - planPays),
        }
        return [network, estimate]
      }),
    ) as Record<NetworkTier, CostEstimate>

    return [{ request, procedure, planPaysPct, byNetwork }]
  })
}

export interface CostTotals {
  fee: number
  planPays: number
  patientPays: number
  overMaximum: number
}

export function totalsFor(items: CostLineItem[], network: NetworkTier): CostTotals {
  return items.reduce<CostTotals>(
    (acc, item) => {
      const e = item.byNetwork[network]
      return {
        fee: roundCents(acc.fee + e.fee),
        planPays: roundCents(acc.planPays + e.planPays),
        patientPays: roundCents(acc.patientPays + e.patientPays),
        overMaximum: roundCents(acc.overMaximum + e.overMaximum),
      }
    },
    { fee: 0, planPays: 0, patientPays: 0, overMaximum: 0 },
  )
}

export const COVERAGE_LABEL: Record<CoverageClass, string> = {
  PREVENTIVE: 'Preventive',
  BASIC: 'Basic',
  MAJOR: 'Major',
  ORTHODONTIC: 'Ortho',
}
