// The co-pilot: turns what a member does in the forms (picks a tooth, switches a
// plan, adds care) into a plain-English note, and what they ask in the chat into
// answers and form changes. Every amount comes from the checked-in plan and the
// shared estimator, never from a model.

import { getTooth, type ToothInfo } from '../data/teeth'
import { PROCEDURES } from '../data/mockData'
import type {
  BenefitSummary,
  CdtProcedure,
  CostLineItem,
  CoverageClass,
  CoverageTier,
  InsurancePlan,
  ProcedureRequest,
} from '../types/domain'
import { COVERAGE_LABEL, estimateProcedures, totalsFor } from './estimate'
import { formatLongDate, formatShortDate, formatUsd } from './format'
import { nextId } from './id'
import { interpretCare } from './mockAssistant'
import { buildEstimateContext } from '../store/selectors'
import { nextYearContext } from './sequencing'
import { answerFromPlan } from './planFacts'
import type { SessionData } from '../store/sessionStore'

export type CopilotSession = Pick<SessionData, 'plan' | 'tiers' | 'benefits' | 'claims' | 'procedures' | 'selectedTooth'>

interface Ready {
  plan: InsurancePlan
  tiers: Record<CoverageClass, CoverageTier>
  benefits: BenefitSummary
}

function ready(s: CopilotSession): Ready | null {
  return s.plan && s.tiers && s.benefits ? { plan: s.plan, tiers: s.tiers, benefits: s.benefits } : null
}

/** Typical care for a tooth: a root canal, a crown and a filling. */
function typicalCodes(tooth: ToothInfo): string[] {
  const front = tooth.type === 'incisor' || tooth.type === 'canine'
  return [front ? 'D3310' : 'D3330', 'D2740', front ? 'D2330' : 'D2391']
}

/** "a root canal (D3330) is Basic care, 80% covered in-network after your $50 deductible". */
function coverageClause(p: CdtProcedure, tier: CoverageTier, benefits: BenefitSummary): string {
  const label = COVERAGE_LABEL[p.coverageClass]
  const after = tier.deductibleApplies
    ? benefits.deductibleRemaining > 0
      ? ` after your ${formatUsd(benefits.deductibleRemaining)} deductible`
      : ' (your deductible is already met)'
    : ' with no deductible'
  const covered = p.isCovered ? `${tier.planPaysPctInNetwork}% covered in-network${after}` : 'not covered'
  return `${p.shortName.toLowerCase()} (${p.cdtCode}) is ${label} care, ${covered}`
}

/** The note that appears when a tooth is picked on the chart. */
export function toothNote(toothNumber: number, s: CopilotSession): string | null {
  const tooth = getTooth(toothNumber)
  const r = ready(s)
  if (!tooth || !r) return null
  const article = /^[aeiou]/i.test(tooth.name) ? 'an' : 'a'
  const clauses = typicalCodes(tooth)
    .map((code) => PROCEDURES[code])
    .filter((p): p is CdtProcedure => Boolean(p))
    .slice(0, 2)
    .map((p) => coverageClause(p, r.tiers[p.coverageClass], r.benefits))
  const wait = Math.max(...Object.values(r.tiers).map((t) => t.waitingPeriodMonths))
  const history = s.claims.filter((c) => c.toothNumber === toothNumber).sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0]
  return [
    `Tooth #${toothNumber} is ${article} ${tooth.name.toLowerCase()}.`,
    `Under your ${r.plan.planName}, ${clauses.join(', and ')}.`,
    wait > 0 ? `Heads up: some care has a ${wait}-month waiting period.` : 'There is no waiting period on this plan.',
    history
      ? `Last on record: ${PROCEDURES[history.cdtCode]?.shortName ?? history.cdtCode} (${history.cdtCode}) on ${formatShortDate(history.serviceDate)}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** The note that appears when a different plan is loaded. */
export function planNote(s: CopilotSession): string | null {
  const r = ready(s)
  if (!r) return null
  const t = r.tiers
  return (
    `Now using ${r.plan.planName}: ${formatUsd(r.benefits.effectiveMaximum)} annual maximum, ${formatUsd(r.benefits.deductible)} deductible. ` +
    `In-network it pays ${t.PREVENTIVE.planPaysPctInNetwork}% of preventive, ${t.BASIC.planPaysPctInNetwork}% of basic and ${t.MAJOR.planPaysPctInNetwork}% of major care.`
  )
}

/** The note after care is added: what it costs and what that does to the maximum. */
export function addedNote(added: ProcedureRequest[], s: CopilotSession): string | null {
  const r = ready(s)
  const ctx = r && buildEstimateContext(s)
  if (!r || !ctx || added.length === 0) return null
  const before = s.procedures.filter((p) => !added.some((a) => a.id === p.id))
  const priced = estimateProcedures([...before, ...added], ctx).filter((li) => added.some((a) => a.id === li.request.id))
  const t = totalsFor(priced, 'IN_NETWORK')
  const all = estimateProcedures(s.procedures, ctx)
  const used = totalsFor(all, 'IN_NETWORK').planPays
  const left = Math.max(r.benefits.remainingMaximum - used, 0)
  const names = priced.map((li) => `${li.procedure.shortName} (${li.procedure.cdtCode})${li.request.toothNumber != null ? ` on #${li.request.toothNumber}` : ''}`).join(' + ')
  return (
    `Added ${names}: insurance pays ${formatUsd(t.planPays)} and you pay ${formatUsd(t.patientPays)} in-network. ` +
    `That leaves ${formatUsd(left)} of your annual maximum.` +
    (t.overMaximum > 0 ? ` ${formatUsd(t.overMaximum)} of insurance payments don't fit under the maximum.` : '')
  )
}

export interface Impact {
  label: string
  items: CostLineItem[]
  planPays: number
  youPay: number
  /** Annual maximum left before and after this care (on top of what's already planned). */
  leftBefore: number
  leftAfter: number
  needsTooth: boolean
}

/** What typed-in care would do to the annual maximum, before it's submitted. */
export function previewImpact(text: string, s: CopilotSession): Impact | null {
  const r = ready(s)
  const ctx = r && buildEstimateContext(s)
  if (!r || !ctx) return null
  const care = interpretCare(text, s.selectedTooth)
  if (!care) return null
  if (!care.codes) return { label: care.label, items: [], planPays: 0, youPay: 0, leftBefore: 0, leftAfter: 0, needsTooth: true }
  const requests: ProcedureRequest[] = care.codes.map((cdtCode) => ({
    id: nextId('preview'),
    cdtCode,
    toothNumber: PROCEDURES[cdtCode]?.isToothSpecific ? (care.tooth?.number ?? null) : null,
  }))
  const planned = totalsFor(estimateProcedures(s.procedures, ctx), 'IN_NETWORK').planPays
  const items = estimateProcedures([...s.procedures, ...requests], ctx).filter((li) => requests.some((q) => q.id === li.request.id))
  const t = totalsFor(items, 'IN_NETWORK')
  const leftBefore = Math.max(r.benefits.remainingMaximum - planned, 0)
  return {
    label: care.label,
    items,
    planPays: t.planPays,
    youPay: t.patientPays,
    leftBefore,
    leftAfter: Math.max(leftBefore - t.planPays, 0),
    needsTooth: false,
  }
}

/** Typical codes when the care is per-tooth and no tooth was named (pricing doesn't depend on which tooth). */
const FALLBACK_CODES: Record<string, string[]> = {
  'A crown': ['D2740'],
  'A root canal': ['D3330'],
  'A filling': ['D2391'],
  'An extraction': ['D7140'],
  'An implant (post + crown)': ['D6010', 'D6065'],
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** "What happens if I get a crown in November?": this plan year versus after the reset. */
function timingAnswer(text: string, s: CopilotSession, r: Ready): string | null {
  const monthIdx = MONTHS.findIndex((m) => new RegExp(`\\b${m}\\b|\\b${m.slice(0, 3)}\\b`).test(text))
  const care = interpretCare(text, s.selectedTooth)
  if (monthIdx < 0 || !care) return null
  const ctx = buildEstimateContext(s)
  if (!ctx) return null
  const codes = care.codes ?? FALLBACK_CODES[care.label] ?? null
  if (!codes) return null

  const end = new Date(`${r.benefits.planYearEnd}T00:00:00Z`)
  const monthStart = new Date(Date.UTC(end.getUTCFullYear(), monthIdx, 1))
  const inThisYear = monthStart <= end
  const requests = codes.map((cdtCode) => ({ id: nextId('t'), cdtCode, toothNumber: null as number | null }))
  const names = codes.map((c) => `${PROCEDURES[c].shortName.toLowerCase()} (${c})`).join(' + ')
  const month = MONTHS[monthIdx][0].toUpperCase() + MONTHS[monthIdx].slice(1)

  const now = totalsFor(estimateProcedures([...s.procedures, ...requests], ctx).slice(-requests.length), 'IN_NETWORK')
  const later = totalsFor(estimateProcedures(requests, nextYearContext(ctx, r.plan)), 'IN_NETWORK')
  const reset = formatLongDate(r.benefits.planYearEnd)

  if (!inThisYear) {
    return `${month} is after your plan year ends (${reset}), so a ${names} then uses your new maximum: insurance pays about ${formatUsd(later.planPays)} and you pay about ${formatUsd(later.patientPays)} in-network, with the deductible starting over.`
  }
  const save = Math.round((now.patientPays - later.patientPays) * 100) / 100
  return (
    `${month} falls inside this plan year (it ends ${reset}), so a ${names} counts against the ${formatUsd(r.benefits.remainingMaximum)} you have left: ` +
    `insurance pays about ${formatUsd(now.planPays)} and you pay about ${formatUsd(now.patientPays)} in-network` +
    (now.overMaximum > 0 ? ` (${formatUsd(now.overMaximum)} more wouldn't fit under the maximum)` : '') +
    `. Waiting until after the reset would cost you about ${formatUsd(later.patientPays)}` +
    (save > 0 ? `, ${formatUsd(save)} less.` : save < 0 ? `, ${formatUsd(-save)} more.` : ', about the same.')
  )
}

function savingsAnswer(s: CopilotSession, r: Ready): string | null {
  const ctx = buildEstimateContext(s)
  if (!ctx) return null
  const planned = s.procedures.length > 0
  const requests: ProcedureRequest[] = planned ? s.procedures : [{ id: 'demo', cdtCode: 'D2740', toothNumber: null }]
  const items = estimateProcedures(requests, ctx)
  const inN = totalsFor(items, 'IN_NETWORK').patientPays
  const outN = totalsFor(items, 'OUT_OF_NETWORK').patientPays
  const what = planned ? 'your planned care' : 'a typical crown (D2740)'
  const save = Math.round((outN - inN) * 100) / 100
  return (
    `For ${what}, you'd pay ${formatUsd(inN)} in-network versus ${formatUsd(outN)} out-of-network, so staying in-network saves you ${formatUsd(save)}. ` +
    `That's because ${r.plan.planName} pays the negotiated rate in-network, but only a share of the dentist's full fee out-of-network, and the dentist can bill you the difference.` +
    (planned ? '' : ' Add your own care in the Operatory and I\'ll compare it.')
  )
}

export interface CopilotReply {
  text: string
  /** Form changes the question implies (bidirectional: the chat can drive the forms). */
  selectTooth?: number
  procedureInput?: string
}

/** Answers a question from the plan and updates the forms it refers to; null when it needs the backend. */
export function askCopilot(question: string, s: CopilotSession): CopilotReply | null {
  const r = ready(s)
  if (!r) return null
  const text = question.toLowerCase()

  const timing = timingAnswer(text, s, r)
  if (timing) {
    const care = interpretCare(text, s.selectedTooth)
    return { text: timing, procedureInput: care ? question.replace(/\?+$/, '') : undefined }
  }

  if (/\b(in-?network )?(savings?|save)\b/.test(text) || /in vs\.? out|in-network vs/.test(text)) {
    const answer = savingsAnswer(s, r)
    if (answer) return { text: answer }
  }

  const toothMatch = text.match(/(?:#|tooth\s*(?:number\s*)?)(\d{1,2})\b/)
  const toothNumber = toothMatch ? Number(toothMatch[1]) : null
  if (toothNumber && getTooth(toothNumber)) {
    const care = interpretCare(text, toothNumber)
    const note = toothNote(toothNumber, s)
    if (note) {
      return {
        text: /\bcover/.test(text) || !care ? note : `${note} I've filled in "${question}" in the Operatory.`,
        selectTooth: toothNumber,
        procedureInput: care && care.codes ? question.replace(/\?+$/, '') : undefined,
      }
    }
  }

  const fromPlan = answerFromPlan(question, r)
  return fromPlan ? { text: fromPlan } : null
}
