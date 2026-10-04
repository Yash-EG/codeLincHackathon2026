// Client for the member list (backend: GET /api/members -> MemberSummary[]), used by
// Reception to check in an employee from the database. The response mirrors
// dto/MemberSummary.java. The backend needs the `db` profile for this; without
// it the call answers 503 and the page keeps the sample plan.

import type { BenefitSummary, CoverageClass, CoverageTier, InsurancePlan, NetworkTier } from '../types/domain'
import { daysUntil } from './format'

/** Mirrors MemberSummary.CoverageRule. */
export interface MemberCoverageRule {
  category: 'PREVENTIVE' | 'BASIC' | 'MAJOR'
  networkType: NetworkTier
  planPaysPct: number
  deductibleApplies: boolean
}

/** Mirrors dto/MemberSummary.java. Money is a number; dates are ISO (YYYY-MM-DD). */
export interface Member {
  /** The userId POST /api/analyze takes. */
  id: string
  fullName: string
  planName: string
  annualMaximum: number
  deductible: number
  planYearStart: string
  planYearEnd: string
  benefitYear: number
  usedThisYear: number
  remainingMaximum: number
  deductibleMet: number
  coverage: MemberCoverageRule[]
}

/** The request failed: `status` is the HTTP status (0 when the server couldn't be reached). */
export class MembersError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'MembersError'
    this.status = status
  }
}

export async function fetchMembers(signal?: AbortSignal): Promise<Member[]> {
  let res: Response
  try {
    res = await fetch('/api/members', { signal, headers: { Accept: 'application/json' } })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new MembersError(0, 'The server could not be reached.')
  }
  if (!res.ok) {
    // A bare 5xx with no JSON body is a proxy or gateway talking (Vite answers 500 when the
    // backend isn't running), not the backend itself.
    let message =
      res.status >= 500
        ? `The backend didn't answer (HTTP ${res.status}). Check that it's running.`
        : `The server answered ${res.status}.`
    try {
      const body = (await res.json()) as { message?: unknown }
      if (typeof body.message === 'string' && body.message) message = body.message
    } catch {
      // Not JSON (a proxy error page, say): keep the status message.
    }
    throw new MembersError(res.status, message)
  }
  const data: unknown = await res.json()
  if (!Array.isArray(data)) throw new MembersError(res.status, 'The member list was not in the expected format.')
  return data as Member[]
}

/** Shown under the plan name for a member checked in from the database. */
export const MEMBER_SOURCE = 'Member database'

/** The plan, coverage tiers and benefit summary the app works with, from one member's record. */
export function memberPlan(member: Member): { plan: InsurancePlan; tiers: Record<CoverageClass, CoverageTier>; benefits: BenefitSummary } {
  const pct = (category: MemberCoverageRule['category'], network: NetworkTier) =>
    member.coverage.find((c) => c.category === category && c.networkType === network)
  const tier = (coverageClass: MemberCoverageRule['category']): CoverageTier => {
    const inNet = pct(coverageClass, 'IN_NETWORK')
    const outNet = pct(coverageClass, 'OUT_OF_NETWORK')
    return {
      coverageClass,
      planPaysPctInNetwork: inNet?.planPaysPct ?? 0,
      planPaysPctOutNetwork: outNet?.planPaysPct ?? 0,
      deductibleApplies: inNet?.deductibleApplies ?? outNet?.deductibleApplies ?? true,
      waitingPeriodMonths: 0,
    }
  }

  const plan: InsurancePlan = {
    id: `member-plan:${member.planName}`,
    carrierName: MEMBER_SOURCE,
    planName: member.planName,
    planType: 'PPO',
    annualMaximum: member.annualMaximum,
    deductibleIndividualIn: member.deductible,
    deductibleIndividualOut: member.deductible,
    rolloverEnabled: false,
    // The database models the out-of-network difference only through a lower plan_pays_pct
    // (the backend uses an allowed ratio of 1.00), so the plan allows the full fee here too.
    oonAllowedRatio: 1,
    summaryOfBenefits: '',
  }

  const daysRemaining = daysUntil(member.planYearEnd)
  const benefits: BenefitSummary = {
    enrollmentId: member.id,
    fullName: member.fullName,
    carrierName: MEMBER_SOURCE,
    planName: member.planName,
    planYearStart: member.planYearStart,
    planYearEnd: member.planYearEnd,
    annualMaximum: member.annualMaximum,
    rolloverBalance: 0,
    effectiveMaximum: member.annualMaximum,
    usedToDate: member.usedThisYear,
    plannedPlanPays: 0,
    remainingMaximum: member.remainingMaximum,
    deductible: member.deductible,
    deductibleMet: member.deductibleMet,
    deductibleRemaining: Math.max(member.deductible - member.deductibleMet, 0),
    daysRemaining,
    benefitsExpiringSoon: daysRemaining <= 90 && member.remainingMaximum > 0,
  }

  return {
    plan,
    benefits,
    tiers: {
      PREVENTIVE: tier('PREVENTIVE'),
      BASIC: tier('BASIC'),
      MAJOR: tier('MAJOR'),
      // The database has no orthodontic coverage rows: not covered.
      ORTHODONTIC: {
        coverageClass: 'ORTHODONTIC',
        planPaysPctInNetwork: 0,
        planPaysPctOutNetwork: 0,
        deductibleApplies: false,
        waitingPeriodMonths: 0,
      },
    },
  }
}
