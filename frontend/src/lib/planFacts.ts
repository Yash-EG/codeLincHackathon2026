// Answers questions about the checked-in plan from the plan's own numbers.
//
// The backend education chat explains terms in general ("what is a deductible?")
// but can't see the member's plan, so personal questions ("what's my crown
// copay?") are answered here, deterministically, from the session. Amounts come
// straight from the plan and are never estimated by a model.

import { COVERAGE_LABEL } from './estimate'
import { formatLongDate, formatUsd } from './format'
import type { BenefitSummary, CoverageClass, CoverageTier, InsurancePlan } from '../types/domain'

export interface PlanFacts {
  plan: InsurancePlan
  tiers: Record<CoverageClass, CoverageTier>
  benefits: BenefitSummary
}

const CARE: Array<{ words: RegExp; coverageClass: CoverageClass; label: string }> = [
  { words: /\b(crowns?|caps?|bridges?|implants?|dentures?|night ?guards?|veneers?)\b/, coverageClass: 'MAJOR', label: 'a crown or other major work' },
  { words: /\b(fillings?|cavit(y|ies)|root canals?|extractions?|pull(ed|ing)? a tooth|gum|periodont\w*)\b/, coverageClass: 'BASIC', label: 'basic care like fillings and root canals' },
  { words: /\b(cleanings?|exams?|check-?ups?|x-?rays?|fluoride|sealants?|preventive)\b/, coverageClass: 'PREVENTIVE', label: 'preventive care' },
  { words: /\b(braces|aligners?|invisalign|orthodont\w*)\b/, coverageClass: 'ORTHODONTIC', label: 'orthodontic care' },
]

function tierSentence(facts: PlanFacts, coverageClass: CoverageClass, label: string): string {
  const tier = facts.tiers[coverageClass]
  const inPct = tier.planPaysPctInNetwork
  const outPct = tier.planPaysPctOutNetwork
  const parts = [
    `On ${facts.plan.planName}, ${label} is covered at ${inPct}% in-network, so you pay ${100 - inPct}% (coinsurance, not a flat copay).`,
    outPct === inPct
      ? 'Out-of-network pays the same share.'
      : `Out-of-network, insurance pays ${outPct}% of the plan's allowed amount, so you pay ${100 - outPct}% plus any difference over that amount.`,
  ]
  if (tier.deductibleApplies) {
    const d = facts.benefits.deductibleRemaining
    parts.push(d > 0 ? `Your ${formatUsd(facts.benefits.deductible)} deductible applies first (${formatUsd(d)} left).` : 'Your deductible is already met.')
  } else {
    parts.push('The deductible does not apply.')
  }
  if (tier.waitingPeriodMonths > 0) parts.push(`There is a ${tier.waitingPeriodMonths}-month waiting period.`)
  return parts.join(' ')
}

/** An answer from the plan's numbers, or null when the question isn't one we can answer from them. */
export function answerFromPlan(question: string, facts: PlanFacts): string | null {
  const q = question.toLowerCase()
  const { benefits } = facts

  if (/\bwaiting periods?\b/.test(q)) {
    const waits = (['PREVENTIVE', 'BASIC', 'MAJOR', 'ORTHODONTIC'] as CoverageClass[])
      .map((c) => ({ c, months: facts.tiers[c].waitingPeriodMonths }))
      .filter((w) => w.months > 0)
    return waits.length === 0
      ? `A waiting period is how long you must be enrolled before a type of care is covered. ${facts.plan.planName} has none: everything is covered from day one.`
      : `A waiting period is how long you must be enrolled before a type of care is covered. On ${facts.plan.planName}: ${waits.map((w) => `${COVERAGE_LABEL[w.c].toLowerCase()} care waits ${w.months} months`).join(', ')}.`
  }

  if (/\b(basic|major)\b.*\b(vs|versus|or|and|differ\w*|difference)\b|\b(vs|versus|differ\w*|difference)\b.*\b(basic|major)\b/.test(q) || /\bwhat does .*(cover|pay)\b/.test(q)) {
    const t = facts.tiers
    return (
      `On ${facts.plan.planName}, insurance pays a share that depends on the kind of care (in-network): ` +
      `preventive ${t.PREVENTIVE.planPaysPctInNetwork}% (cleanings, exams, X-rays), ` +
      `basic ${t.BASIC.planPaysPctInNetwork}% (fillings, root canals, simple extractions), and ` +
      `major ${t.MAJOR.planPaysPctInNetwork}% (crowns, implants, night guards).`
    )
  }

  for (const care of CARE) {
    if (care.words.test(q)) return tierSentence(facts, care.coverageClass, care.label)
  }

  if (/\bdeductible\b/.test(q) && /\b(my|mine|i|left|met|how much)\b/.test(q)) {
    return benefits.deductibleRemaining > 0
      ? `Your deductible is ${formatUsd(benefits.deductible)}, and ${formatUsd(benefits.deductibleRemaining)} is still left to pay before coinsurance starts on basic and major care.`
      : `Your ${formatUsd(benefits.deductible)} deductible is already met this plan year.`
  }

  if (/\b(annual max\w*|maximum|left|remaining|how much (do i|can i))\b/.test(q)) {
    return (
      `Your annual maximum is ${formatUsd(benefits.effectiveMaximum)}. You've used ${formatUsd(benefits.usedToDate)}, ` +
      `so ${formatUsd(Math.max(benefits.remainingMaximum, 0))} is left. It resets ${formatLongDate(benefits.planYearEnd)} (${benefits.daysRemaining} days), and unused dollars don't carry over${facts.plan.rolloverEnabled ? ' unless your plan rolls them over' : ''}.`
    )
  }

  return null
}
