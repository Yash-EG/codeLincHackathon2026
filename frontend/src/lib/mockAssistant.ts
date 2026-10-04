// Stand-in for the Bedrock-backed assistant so the UI is fully demoable offline.
//
// TODO(backend): replace the body of sendAssistantMessage with
//   const res = await fetch('/api/assistant/chat', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ enrollmentId, message, toothNumber }),
//   })
//   return res.json() as Promise<AssistantReply>
// The Spring Boot endpoint maps free text -> CDT codes with Bedrock, prices them
// from v_plan_procedure_coverage and returns the same AssistantReply shape.

import { findTooth, getTooth, type Arch, type Side, type ToothInfo } from '../data/teeth'
import type {
  AiAnalysis,
  BenefitClaim,
  CdtProcedure,
  CostLineItem,
  ProcedureRequest,
  SequenceStep,
  TreatmentPlanItem,
} from '../types/domain'
import { COVERAGE_LABEL, totalsFor } from './estimate'
import { formatLongDate, formatShortDate, formatUsd, roundCents } from './format'
import { nextId } from './id'
import { earlyNextYear, type TimingComparison } from './sequencing'

export interface AssistantContext {
  procedures: Record<string, CdtProcedure>
  /** Prices new requests as if appended after the current plan (deductible + maximum carry over). */
  estimate: (requests: ProcedureRequest[]) => CostLineItem[]
  /** Prices requests in the next plan year, after the care already moved there. */
  estimateNextYear: (requests: ProcedureRequest[]) => CostLineItem[]
  /** Prices `later` straight after `now` this year versus after Jan 1 (both after the current plan). */
  compare: (now: ProcedureRequest[], later: ProcedureRequest[]) => TimingComparison
  /** Procedures already in the plan (used to avoid duplicates). */
  planned: ProcedureRequest[]
  /** Care already moved into the next plan year. */
  deferred: TreatmentPlanItem[]
  /** This plan year's claims (used for frequency limits). */
  claims: BenefitClaim[]
  planName: string
  planYearEnd: string
  daysRemaining: number
  /** Annual maximum left before the current plan (from claims only). */
  remainingBeforePlan: number
  /** Plan payments already committed by the current breakdown. */
  plannedPlanPays: number
}

export interface AssistantReply {
  content: string
  /** Care to add to this plan year. */
  requests: ProcedureRequest[]
  lineItems: CostLineItem[]
  /** Care to book after the maximum resets. */
  deferred: TreatmentPlanItem[]
  analysis: AiAnalysis | null
}

/** Care that usually has to follow another procedure on the same tooth. */
const FOLLOW_UPS: Record<string, { cdtCode: string; noun: string; why: string }> = {
  D3330: {
    cdtCode: 'D2740',
    noun: 'crown',
    why: 'A back tooth turns brittle after a root canal, so it needs a crown to keep it from cracking.',
  },
}

/** A reply that prices nothing. */
const say = (content: string): AssistantReply => ({ content, requests: [], lineItems: [], deferred: [], analysis: null })

interface Intent {
  pattern: RegExp
  label: string
  /** Returns CDT codes for the resolved tooth, or null when a tooth is required but missing. */
  codes: (tooth: ToothInfo | undefined, text: string) => string[] | null
}

const isFront = (t: ToothInfo) => t.type === 'incisor' || t.type === 'canine'

const INTENTS: Intent[] = [
  { pattern: /implant/, label: 'An implant (post + crown)', codes: (t) => (t ? ['D6010', 'D6065'] : null) },
  { pattern: /root ?canal|endo/, label: 'A root canal', codes: (t) => (t ? [isFront(t) ? 'D3310' : 'D3330'] : null) },
  {
    pattern: /crown|\bcap\b/,
    label: 'A crown',
    codes: (t, text) => (t ? (/build ?-?up/.test(text) ? ['D2950', 'D2740'] : ['D2740']) : null),
  },
  {
    pattern: /extract|pull|remov|wisdom/,
    label: 'An extraction',
    codes: (t) => (t ? [t.indexFromMidline === 7 ? 'D7240' : 'D7140'] : null),
  },
  { pattern: /deep clean|scaling|root planing|gum/, label: 'A deep cleaning', codes: () => ['D4341'] },
  { pattern: /clean|prophy|hygien/, label: 'A cleaning', codes: () => ['D1110'] },
  {
    pattern: /filling|cavit|decay/,
    label: 'A filling',
    codes: (t, text) => {
      if (!t) return null
      if (isFront(t)) return ['D2330']
      return [/\btwo\b|\b2[- ]?surf|large|big|deep/.test(text) ? 'D2392' : 'D2391']
    },
  },
  { pattern: /night ?guard|mouth ?guard|grind|clench|bruxism/, label: 'A night guard', codes: () => ['D9944'] },
  { pattern: /pain|hurt|ache|sensitiv|chipped|broke|crack/, label: 'A problem-focused exam', codes: () => ['D0140'] },
]

/** "#19", "tooth 19" > selected tooth in 3D > "lower left molar" style descriptions. */
function resolveTooth(text: string, selectedTooth: number | null): ToothInfo | undefined {
  const explicit = text.match(/(?:#|tooth\s*(?:number\s*)?)(\d{1,2})\b/)
  if (explicit) return getTooth(Number(explicit[1]))
  if (selectedTooth) return getTooth(selectedTooth)

  const index = /wisdom/.test(text)
    ? 7
    : /premolar|bicuspid/.test(text)
      ? 3
      : /molar|back/.test(text)
        ? 5
        : /canine|eye ?tooth/.test(text)
          ? 2
          : /front|incisor/.test(text)
            ? 0
            : undefined
  if (index === undefined) return undefined
  const arch: Arch = /upper|top/.test(text) ? 'upper' : 'lower'
  const side: Side = /right/.test(text) ? 'right' : 'left'
  return findTooth(arch, side, index)
}

/**
 * Reads free text as care: which procedure, which tooth, and the CDT codes that
 * implies. `codes` is null when the care is per-tooth and no tooth was named or
 * selected. Returns null when nothing in the text looks like a procedure.
 */
export function interpretCare(
  message: string,
  selectedTooth: number | null,
): { label: string; tooth: ToothInfo | undefined; codes: string[] | null } | null {
  const text = message.toLowerCase()
  const intent = INTENTS.find((i) => i.pattern.test(text))
  if (!intent) return null
  const tooth = resolveTooth(text, selectedTooth)
  return { label: intent.label, tooth, codes: intent.codes(tooth, text) }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const patientPays = (items: CostLineItem[], network: 'IN_NETWORK' | 'OUT_OF_NETWORK' = 'IN_NETWORK') =>
  totalsFor(items, network).patientPays

export async function sendAssistantMessage(
  message: string,
  selectedTooth: number | null,
  ctx: AssistantContext,
): Promise<AssistantReply> {
  await delay(650)
  const text = message.toLowerCase()
  const intent = INTENTS.find((i) => i.pattern.test(text))

  if (
    !intent &&
    /expir|use it or lose|lose (it|my)|how much (is |do i have )?left|what'?s left|remaining|deadline|dec(ember)? ?31|end of (the )?year/.test(
      text,
    )
  ) {
    const leftover = Math.max(ctx.remainingBeforePlan - ctx.plannedPlanPays, 0)
    return say(
      `You have ${formatUsd(ctx.remainingBeforePlan)} of your ${ctx.planName} maximum left, and it resets on ` +
        `${formatLongDate(ctx.planYearEnd)} (${ctx.daysRemaining} days). Your current plan uses ` +
        `${formatUsd(ctx.plannedPlanPays)} of it, so ${formatUsd(leftover)} would still go unused. ` +
        `Preventive visits don't touch your deductible, and Basic work like fillings is covered at 80%. ` +
        `Both are good ways to use what's left.`,
    )
  }

  if (!intent) {
    return say(
      "I couldn't match that to a procedure yet. Try describing it the way your dentist did, e.g. " +
        '"root canal on tooth #14", "crown on my lower left molar" or "cleaning". ' +
        'You can also pick a tooth on the tooth map first.',
    )
  }

  const tooth = resolveTooth(text, selectedTooth)
  const codes = intent.codes(tooth, text)
  if (!codes) {
    return say(
      `${intent.label} is billed per tooth. Which tooth is it? Pick it on the tooth map, or say something like "lower left molar" or "#14".`,
    )
  }

  const year = ctx.planYearEnd.slice(0, 4)
  const nextYear = Number(year) + 1
  const requests: ProcedureRequest[] = codes.map((cdtCode) => ({
    id: nextId('req'),
    cdtCode,
    toothNumber: ctx.procedures[cdtCode]?.isToothSpecific ? (tooth?.number ?? null) : null,
  }))

  const isPlanned = (r: { cdtCode: string; toothNumber: number | null }) =>
    ctx.planned.some((p) => p.cdtCode === r.cdtCode && p.toothNumber === r.toothNumber) ||
    ctx.deferred.some((d) => d.cdtCode === r.cdtCode && d.toothNumber === r.toothNumber)
  if (requests.every(isPlanned)) {
    const names = requests.map((r) => ctx.procedures[r.cdtCode]?.shortName ?? r.cdtCode).join(' + ')
    return say(
      `${names}${tooth && requests[0].toothNumber ? ` on #${tooth.number}` : ''} is already in your plan. Open the cost breakdown to see its estimate.`,
    )
  }

  // Frequency limits (e.g. 2 cleanings per benefit year): steer it into next year.
  for (const r of requests) {
    const procedure = ctx.procedures[r.cdtCode]
    if (!procedure?.frequencyPerYear) continue
    const used = ctx.claims.filter((c) => c.cdtCode === r.cdtCode)
    if (used.length >= procedure.frequencyPerYear) {
      const howMany = used.length === 1 ? 'your' : used.length === 2 ? 'both of your' : `all ${used.length} of your`
      const noun = procedure.shortName.toLowerCase() + (used.length > 1 ? 's' : '')
      const dates = used.map((c) => formatShortDate(c.serviceDate)).join(' and ')
      const rate = procedure.coverageClass === 'PREVENTIVE' ? '100%' : 'your normal rate'
      return say(
        `You've used ${howMany} ${year} ${noun} (${dates}), so ${ctx.planName} won't pay for another this year. ` +
          `Book it for early January: it's covered at ${rate} once your benefits reset, instead of the full ` +
          `${formatUsd(procedure.inNetworkFee)} now.`,
      )
    }
  }

  // Care that has to follow (a crown after a molar root canal): this year, or after the reset if that's cheaper.
  const followUps: Array<{ request: ProcedureRequest; noun: string; why: string }> = requests.flatMap((r) => {
    const rule = FOLLOW_UPS[r.cdtCode]
    if (!rule || r.toothNumber == null || isPlanned({ cdtCode: rule.cdtCode, toothNumber: r.toothNumber })) return []
    return [{ request: { id: nextId('req'), cdtCode: rule.cdtCode, toothNumber: r.toothNumber }, noun: rule.noun, why: rule.why }]
  })
  const timing = followUps.length > 0 ? ctx.compare(requests, followUps.map((f) => f.request)) : null
  const defer = timing != null && timing.savings > 0
  const bookOn = earlyNextYear(ctx.planYearEnd)
  const thisYear = defer ? requests : [...requests, ...followUps.map((f) => f.request)]

  const lineItems = ctx.estimate(thisYear)
  if (lineItems.length === 0) return say("That procedure isn't in your plan's fee schedule yet.")
  const laterItems = defer ? ctx.estimateNextYear(followUps.map((f) => f.request)) : []

  const deferred: TreatmentPlanItem[] = laterItems.map((li, i) => ({
    id: li.request.id,
    cdtCode: li.request.cdtCode,
    toothNumber: li.request.toothNumber,
    surfaces: null,
    status: 'PROPOSED',
    urgency: 'SOON',
    recommendedDate: bookOn,
    sequenceOrder: lineItems.length + i + 1,
    aiRationale:
      `${followUps[i].why} Booked after Jan 1, a fresh ${nextYear} maximum pays ` +
      `${formatUsd(li.byNetwork.IN_NETWORK.planPays)} of it` +
      (timing ? `, ${formatUsd(timing.savings)} more than what is left of your ${year} maximum would.` : '.'),
  }))

  const inNet = totalsFor(lineItems, 'IN_NETWORK')
  const outNet = totalsFor(lineItems, 'OUT_OF_NETWORK')
  const first = lineItems[0]
  const where = tooth && first.request.toothNumber ? ` on #${tooth.number} (${tooth.name.toLowerCase()})` : ''
  const described = requests.length
  const deductibleNote = lineItems.some((li) => li.byNetwork.IN_NETWORK.deductibleApplied > 0)
    ? ' after the rest of your deductible'
    : ''
  const coverage =
    described === 1
      ? `is a ${COVERAGE_LABEL[first.procedure.coverageClass]} service on ${ctx.planName}, so insurance pays ${first.planPaysPct.IN_NETWORK}%${deductibleNote}.`
      : `is billed as ${described} codes on ${ctx.planName}: ` +
        lineItems
          .slice(0, described)
          .map((li) => `${li.procedure.shortName} (${COVERAGE_LABEL[li.procedure.coverageClass]}, ${li.planPaysPct.IN_NETWORK}%)`)
          .join(' and ') +
        `${deductibleNote}.`
  const remainingAfter = Math.max(ctx.remainingBeforePlan - ctx.plannedPlanPays - inNet.planPays, 0)

  const nameOf = (li: CostLineItem) =>
    `${li.procedure.shortName}${li.request.toothNumber != null ? ` on tooth #${li.request.toothNumber}` : ''}`
  const steps: SequenceStep[] = [
    ...lineItems.map((li, i) => ({
      step: i + 1,
      label: nameOf(li),
      timing: 'this-year' as const,
      youPay: li.byNetwork.IN_NETWORK.patientPays,
      reason:
        i < described
          ? `Do it now: ${li.procedure.plainDescription.charAt(0).toLowerCase()}${li.procedure.plainDescription.slice(1)}`
          : (followUps.find((f) => f.request.id === li.request.id)?.why ?? ''),
    })),
    ...laterItems.map((li, i) => ({
      step: lineItems.length + i + 1,
      label: nameOf(li),
      timing: 'next-year' as const,
      date: bookOn,
      youPay: li.byNetwork.IN_NETWORK.patientPays,
      reason: deferred[i].aiRationale,
    })),
  ]
  const analysis: AiAnalysis = {
    simplifiedExplanation: [...lineItems, ...laterItems]
      .map((li) => `${li.procedure.shortName}: ${li.procedure.plainDescription}`)
      .join(' '),
    estimatedCost: roundCents(inNet.fee + laterItems.reduce((sum, li) => sum + li.byNetwork.IN_NETWORK.fee, 0)),
    inNetworkCost: roundCents(inNet.patientPays + patientPays(laterItems)),
    outOfNetworkCost: roundCents(outNet.patientPays + patientPays(laterItems, 'OUT_OF_NETWORK')),
    suggestedSequence: steps,
    savings: defer && timing ? timing.savings : 0,
  }

  const parts = [
    `${intent.label}${where} ${coverage}`,
    `In-network estimate: ${formatUsd(inNet.fee)} total. Insurance pays ${formatUsd(inNet.planPays)} and you pay ${formatUsd(inNet.patientPays)}.`,
    `Out-of-network you'd pay about ${formatUsd(outNet.patientPays)} (${formatUsd(outNet.patientPays - inNet.patientPays)} more).`,
  ]
  if (defer && timing) {
    const later = followUps.map((f) => f.noun).join(' and ')
    parts.push(
      `${followUps[0].why} Do step 1 now and step ${steps.length} (the ${later}) after Jan 1 to save ${formatUsd(timing.savings)}: ` +
        `your ${nextYear} maximum starts fresh and pays ${formatUsd(totalsFor(laterItems, 'IN_NETWORK').planPays)} of it.`,
      `I added step 1 to this year's cost breakdown and booked step ${steps.length} for ${formatShortDate(bookOn)}, ${nextYear}.`,
    )
  } else {
    parts.push(
      inNet.overMaximum > 0
        ? `Heads up: ${formatUsd(inNet.overMaximum)} of this is more than your ${year} maximum can cover. Moving part of the work past Jan 1 would put a fresh maximum to work.`
        : `That leaves ${formatUsd(remainingAfter)} of your ${year} maximum.`,
      followUps.length > 0
        ? `${followUps[0].why} It fits this year, so I added it to your cost breakdown too.`
        : 'I added it to your cost breakdown.',
    )
  }

  return { content: parts.join(' '), requests: thisYear, lineItems, deferred, analysis }
}
