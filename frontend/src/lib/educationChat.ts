// Client for the benefits-EDUCATION chatbot (backend: POST /api/education/chat).
//
// This is a SEPARATE capability from the procedure-estimate assistant in
// lib/mockAssistant.ts. It answers general benefits questions ("what is a
// deductible?") and, when verified plan facts are available server-side,
// personal-plan questions. It never computes prices — those become an estimate
// handoff.
//
// If the backend is unreachable (offline demo), we fall back to a small
// deterministic responder that mirrors the server's glossary + routing, so the
// Imaging tab's chat is usable without the Spring Boot service running.

/** Mirrors the backend EducationIntent enum. */
export type EducationIntent =
  | 'GENERAL_DEFINITION'
  | 'PERSONAL_PLAN_QUESTION'
  | 'ESTIMATE_REQUEST'
  | 'OUT_OF_SCOPE'

/** Mirrors the backend EducationChatResponse DTO. */
export interface EducationChatResponse {
  intent: EducationIntent
  answer: string
  /** false = personal question but no verified facts; true = facts used; null = not a personal question. */
  personalPlanDataAvailable: boolean | null
  estimateHandoff: boolean
  termsUsed: string[]
  modelUsed: boolean
  /** Where the answer came from: the backend, or the in-browser offline fallback. */
  source: 'backend' | 'offline'
}

/**
 * Ask the education chatbot. Tries the backend first; on any network/HTTP error
 * falls back to the offline responder so the demo keeps working.
 */
export async function askEducation(message: string): Promise<EducationChatResponse> {
  try {
    const res = await fetch('/api/education/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error(`education chat failed: ${res.status}`)
    const data = (await res.json()) as Omit<EducationChatResponse, 'source'>
    return { ...data, source: 'backend' }
  } catch {
    return offlineEducationAnswer(message)
  }
}

// --- Offline fallback -------------------------------------------------------
// Keep in sync with backend resources/education/glossary.json. General concepts
// only — never plan-specific amounts.

interface GlossaryEntry {
  key: string
  aliases: string[]
  definition: string
}

const GLOSSARY: GlossaryEntry[] = [
  { key: 'deductible', aliases: ['deductible', 'deductable'], definition: 'A deductible is the amount you may need to pay for covered care before your plan starts paying for certain services. What counts toward it depends on your plan.' },
  { key: 'copay', aliases: ['copay', 'co-pay', 'co pay', 'copayment'], definition: 'A copay is a fixed dollar amount you pay for a covered service, for example a set fee for a visit. It does not change with the total bill.' },
  { key: 'coinsurance', aliases: ['coinsurance', 'co-insurance', 'co insurance'], definition: 'Coinsurance is a percentage of the cost of a covered service that you pay, rather than a fixed dollar amount. For example, if your plan covers a service at 80%, your coinsurance is the remaining 20%.' },
  { key: 'annual_maximum', aliases: ['annual maximum', 'annual max', 'yearly maximum', 'plan maximum', 'benefit maximum', 'maximum benefit'], definition: 'An annual maximum is the most a dental plan will pay toward your covered care during a plan year. Once the plan has paid that much, you typically pay the full cost of further care until the plan year resets.' },
  { key: 'in_network', aliases: ['in network', 'in-network', 'network dentist', 'participating provider'], definition: "An in-network dentist has agreed to the plan's negotiated prices. Staying in network usually means lower out-of-pocket costs and no surprise charges above the agreed amount." },
  { key: 'out_of_network', aliases: ['out of network', 'out-of-network', 'oon', 'nonparticipating', 'non-participating'], definition: "An out-of-network dentist has not agreed to the plan's negotiated prices. The plan may pay less, and you may owe the difference between the dentist's charge and the amount the plan allows." },
  { key: 'allowed_amount', aliases: ['allowed amount', 'allowed charge', 'allowable', 'ucr', 'usual customary and reasonable'], definition: 'The allowed amount is the maximum amount a plan considers reasonable for a covered service. The plan calculates its share from this amount, not necessarily from the dentist\u2019s full charge.' },
  { key: 'balance_billing', aliases: ['balance billing', 'balance bill', 'balance-billing'], definition: 'Balance billing is when an out-of-network dentist bills you for the difference between their charge and the amount your plan allows. In-network dentists generally cannot balance bill for covered services.' },
]

const ESTIMATE_RE = /\b(how much|cost(s)?|price|estimate|out[- ]of[- ]pocket)\b/i
const PROCEDURE_RE = /\b(crown|filling|root canal|implant|extraction|cleaning|exam|x-?ray|night ?guard|bridge|denture|veneer|whitening|sealant|procedure)\b/i
const PERSONAL_RE = /\b(my|mine|i have|do i have|for me)\b/i

function matches(text: string): GlossaryEntry[] {
  const q = text.toLowerCase()
  return GLOSSARY.filter((e) => e.aliases.some((a) => q.includes(a)))
}

/** Deterministic offline mirror of the backend routing + glossary answers. */
export function offlineEducationAnswer(message: string): EducationChatResponse {
  const q = message.toLowerCase()
  const found = matches(message)
  const terms = found.map((e) => e.key)
  const isEstimate = ESTIMATE_RE.test(q) && (PROCEDURE_RE.test(q) || PERSONAL_RE.test(q))

  if (isEstimate) {
    const lead = found.length > 0 ? `In general: ${found[0].definition} ` : ''
    return {
      intent: 'ESTIMATE_REQUEST',
      answer:
        lead +
        "For what a specific procedure would cost you, I can't calculate that here. Head to the cost-estimate tool, " +
        'which uses your plan\u2019s fees and coverage to give you a figure. No price is shown here because it hasn\u2019t been calculated.',
      personalPlanDataAvailable: null,
      estimateHandoff: true,
      termsUsed: terms.slice(0, 1),
      modelUsed: false,
      source: 'offline',
    }
  }

  const personal = PERSONAL_RE.test(q)
  if (personal && found.length > 0) {
    const general = `In general: ${found.map((e) => e.definition).join(' ')}`
    return {
      intent: 'PERSONAL_PLAN_QUESTION',
      answer:
        general +
        " I can't verify your specific plan amounts in this offline demo: that requires your authenticated plan details. " +
        'Once connected, I can tell you your own numbers.',
      personalPlanDataAvailable: false,
      estimateHandoff: false,
      termsUsed: terms,
      modelUsed: false,
      source: 'offline',
    }
  }

  if (found.length > 0) {
    return {
      intent: 'GENERAL_DEFINITION',
      answer: `In general: ${found.map((e) => e.definition).join(' ')}`,
      personalPlanDataAvailable: null,
      estimateHandoff: false,
      termsUsed: terms,
      modelUsed: false,
      source: 'offline',
    }
  }

  return {
    intent: 'OUT_OF_SCOPE',
    answer:
      'I can explain dental benefits terms (like deductible, copay, coinsurance, annual maximum, and in- vs out-of-network) ' +
      'and, when your plan details are available, what they mean for you. Try asking one of those.',
    personalPlanDataAvailable: null,
    estimateHandoff: false,
    termsUsed: [],
    modelUsed: false,
    source: 'offline',
  }
}
