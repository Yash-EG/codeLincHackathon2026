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
import type { BenefitClaim, CdtProcedure, CostLineItem, ProcedureRequest } from '../types/domain'
import { COVERAGE_LABEL, totalsFor } from './estimate'
import { formatLongDate, formatShortDate, formatUsd } from './format'
import { nextId } from './id'

export interface AssistantContext {
  procedures: Record<string, CdtProcedure>
  /** Prices new requests as if appended after the current plan (deductible + maximum carry over). */
  estimate: (requests: ProcedureRequest[]) => CostLineItem[]
  /** Procedures already in the plan (used to avoid duplicates). */
  planned: ProcedureRequest[]
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
  requests: ProcedureRequest[]
  lineItems: CostLineItem[]
}

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
    return {
      content:
        `You have ${formatUsd(ctx.remainingBeforePlan)} of your ${ctx.planName} maximum left, and it resets on ` +
        `${formatLongDate(ctx.planYearEnd)} (${ctx.daysRemaining} days). Your current plan uses ` +
        `${formatUsd(ctx.plannedPlanPays)} of it, so ${formatUsd(leftover)} would still go unused. ` +
        `Preventive visits don't touch your deductible, and Basic work like fillings is covered at 80%. ` +
        `Both are good ways to use what's left.`,
      requests: [],
      lineItems: [],
    }
  }

  if (!intent) {
    return {
      content:
        "I couldn't match that to a procedure yet. Try describing it the way your dentist did, e.g. " +
        '"crown on my lower left molar", "two-surface filling on #30", "root canal" or "cleaning". ' +
        'You can also click a tooth on the model first.',
      requests: [],
      lineItems: [],
    }
  }

  const tooth = resolveTooth(text, selectedTooth)
  const codes = intent.codes(tooth, text)
  if (!codes) {
    return {
      content: `${intent.label} is billed per tooth. Which tooth is it? Click it on the 3D model, or say something like "lower left molar" or "#19".`,
      requests: [],
      lineItems: [],
    }
  }

  const year = ctx.planYearEnd.slice(0, 4)
  const requests: ProcedureRequest[] = codes.map((cdtCode) => ({
    id: nextId('req'),
    cdtCode,
    toothNumber: ctx.procedures[cdtCode]?.isToothSpecific ? (tooth?.number ?? null) : null,
  }))

  const alreadyPlanned = requests.every((r) =>
    ctx.planned.some((p) => p.cdtCode === r.cdtCode && p.toothNumber === r.toothNumber),
  )
  if (alreadyPlanned) {
    const names = requests.map((r) => ctx.procedures[r.cdtCode]?.shortName ?? r.cdtCode).join(' + ')
    return {
      content: `${names}${tooth && requests[0].toothNumber ? ` on #${tooth.number}` : ''} is already in your plan. Open the cost breakdown to see its estimate.`,
      requests: [],
      lineItems: [],
    }
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
      return {
        content:
          `You've used ${howMany} ${year} ${noun} (${dates}), so ${ctx.planName} won't pay for another this year. ` +
          `Book it for early January: it's covered at ${rate} once your benefits reset, instead of the full ` +
          `${formatUsd(procedure.inNetworkFee)} now.`,
        requests: [],
        lineItems: [],
      }
    }
  }

  const lineItems = ctx.estimate(requests)
  if (lineItems.length === 0) {
    return { content: "That procedure isn't in your plan's fee schedule yet.", requests: [], lineItems: [] }
  }

  const inNet = totalsFor(lineItems, 'IN_NETWORK')
  const outNet = totalsFor(lineItems, 'OUT_OF_NETWORK')
  const first = lineItems[0]
  const where = tooth && first.request.toothNumber ? ` on #${tooth.number} (${tooth.name.toLowerCase()})` : ''
  const deductibleNote = lineItems.some((li) => li.byNetwork.IN_NETWORK.deductibleApplied > 0)
    ? ' after the rest of your deductible'
    : ''
  const coverage =
    lineItems.length === 1
      ? `is a ${COVERAGE_LABEL[first.procedure.coverageClass]} service on ${ctx.planName}, so insurance pays ${first.planPaysPct.IN_NETWORK}%${deductibleNote}.`
      : `is billed as ${lineItems.length} codes on ${ctx.planName}: ` +
        lineItems
          .map((li) => `${li.procedure.shortName} (${COVERAGE_LABEL[li.procedure.coverageClass]}, ${li.planPaysPct.IN_NETWORK}%)`)
          .join(' and ') +
        `${deductibleNote}.`
  const remainingAfter = Math.max(ctx.remainingBeforePlan - ctx.plannedPlanPays - inNet.planPays, 0)

  const parts = [
    `${intent.label}${where} ${coverage}`,
    `In-network estimate: ${formatUsd(inNet.fee)} total. Insurance pays ${formatUsd(inNet.planPays)} and you pay ${formatUsd(inNet.patientPays)}.`,
    `Out-of-network you'd pay about ${formatUsd(outNet.patientPays)} (${formatUsd(outNet.patientPays - inNet.patientPays)} more).`,
    inNet.overMaximum > 0
      ? `Heads up: ${formatUsd(inNet.overMaximum)} of this is more than your ${year} maximum can cover. Moving part of the work past Jan 1 would put a fresh maximum to work.`
      : `That leaves ${formatUsd(remainingAfter)} of your ${year} maximum.`,
    'I added it to your cost breakdown.',
  ]

  return { content: parts.join(' '), requests, lineItems }
}
