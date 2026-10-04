// Mock data for the demo user (Maya Chen). Two sample plans share her claims
// and the fee schedule:
//   Lincoln Preferred PPO: the challenge's walkthrough numbers. $1,500 maximum,
//     $400 used, deductible not met, and a root canal on tooth #14 that needs a
//     crown afterwards, which is $315 cheaper with the crown after Jan 1.
//   Lincoln High-Option Dental: a $2,500 maximum and richer coinsurance, so the
//     same crown fits this year (waiting would only add a second deductible).
// See lib/sequencing.ts for the comparison.
// The shapes match the Neon schema; the values are tuned for the demo and are
// not the db/migrations seed. Replace these exports with fetches to the Spring
// Boot backend when it is ready.

import type {
  BenefitClaim,
  BenefitSummary,
  CdtProcedure,
  CoverageClass,
  CoverageTier,
  InsurancePlan,
  JargonTranslation,
  Provider,
} from '../types/domain'
import { daysUntil } from '../lib/format'

export const PLAN: InsurancePlan = {
  id: '22222222-2222-4222-8222-000000000002',
  carrierName: 'Ivorycrest Mutual',
  planName: 'Lincoln Preferred PPO',
  planType: 'PPO',
  annualMaximum: 1500,
  deductibleIndividualIn: 50,
  deductibleIndividualOut: 100,
  rolloverEnabled: false,
  oonAllowedRatio: 0.8,
  summaryOfBenefits:
    'The Annual Benefit Maximum of $1,500 per Covered Person applies to all Classes of service combined, in- and out-of-network, and renews on January 1 of each Benefit Period. A Calendar Year Deductible of $50 per Covered Person ($100 out-of-network) applies to Class II (Basic) and Class III (Major) services. Endodontic services are reimbursed under Class II (Basic) Coinsurance. Out-of-network claims are adjudicated at the 80th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing. Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months. Unused benefits, including the Annual Maximum, do not carry forward to any subsequent Benefit Period.',
}

export const HIGH_OPTION_PLAN: InsurancePlan = {
  id: '22222222-2222-4222-8222-000000000003',
  carrierName: 'Ivorycrest Mutual',
  planName: 'Lincoln High-Option Dental',
  planType: 'PPO',
  annualMaximum: 2500,
  deductibleIndividualIn: 50,
  deductibleIndividualOut: 100,
  rolloverEnabled: false,
  oonAllowedRatio: 0.9,
  summaryOfBenefits:
    'The Annual Benefit Maximum of $2,500 per Covered Person applies to all Classes of service combined, in- and out-of-network, and renews on January 1 of each Benefit Period. A Calendar Year Deductible of $50 per Covered Person ($100 out-of-network) applies to Class II (Basic) and Class III (Major) services. Class II (Basic) services, including Endodontics, are reimbursed at 90% in-network and Class III (Major) services at 60% in-network. Out-of-network claims are adjudicated at the 90th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing. Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months. Unused benefits, including the Annual Maximum, do not carry forward to any subsequent Benefit Period.',
}

export const COVERAGE_TIERS: Record<CoverageClass, CoverageTier> = {
  PREVENTIVE: { coverageClass: 'PREVENTIVE', planPaysPctInNetwork: 100, planPaysPctOutNetwork: 100, deductibleApplies: false, waitingPeriodMonths: 0 },
  BASIC: { coverageClass: 'BASIC', planPaysPctInNetwork: 80, planPaysPctOutNetwork: 70, deductibleApplies: true, waitingPeriodMonths: 0 },
  MAJOR: { coverageClass: 'MAJOR', planPaysPctInNetwork: 50, planPaysPctOutNetwork: 40, deductibleApplies: true, waitingPeriodMonths: 0 },
  ORTHODONTIC: { coverageClass: 'ORTHODONTIC', planPaysPctInNetwork: 50, planPaysPctOutNetwork: 50, deductibleApplies: false, waitingPeriodMonths: 0 },
}

export const HIGH_OPTION_TIERS: Record<CoverageClass, CoverageTier> = {
  PREVENTIVE: { coverageClass: 'PREVENTIVE', planPaysPctInNetwork: 100, planPaysPctOutNetwork: 100, deductibleApplies: false, waitingPeriodMonths: 0 },
  BASIC: { coverageClass: 'BASIC', planPaysPctInNetwork: 90, planPaysPctOutNetwork: 80, deductibleApplies: true, waitingPeriodMonths: 0 },
  MAJOR: { coverageClass: 'MAJOR', planPaysPctInNetwork: 60, planPaysPctOutNetwork: 50, deductibleApplies: true, waitingPeriodMonths: 0 },
  ORTHODONTIC: { coverageClass: 'ORTHODONTIC', planPaysPctInNetwork: 50, planPaysPctOutNetwork: 50, deductibleApplies: false, waitingPeriodMonths: 0 },
}

/** v_plan_procedure_coverage rows for Lincoln Preferred PPO, NATIONAL fee region. */
const PROCEDURE_LIST: CdtProcedure[] = [
  { cdtCode: 'D0120', shortName: 'Periodic oral evaluation', plainDescription: 'Routine check-up exam for an existing patient.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 2, inNetworkFee: 52, ucrFee: 75 },
  { cdtCode: 'D0140', shortName: 'Limited oral evaluation', plainDescription: 'A focused exam for one problem, like a toothache or chipped tooth.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, inNetworkFee: 72, ucrFee: 105 },
  { cdtCode: 'D0274', shortName: 'Bitewing X-rays (4 films)', plainDescription: 'X-rays that look for cavities between the back teeth.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 1, inNetworkFee: 48, ucrFee: 70 },
  { cdtCode: 'D1110', shortName: 'Adult cleaning', plainDescription: 'Routine professional teeth cleaning (prophylaxis).', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 2, inNetworkFee: 88, ucrFee: 125 },
  { cdtCode: 'D2330', shortName: 'Composite filling, 1 surface (front)', plainDescription: 'A tooth-colored filling on one side of a front tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 120, ucrFee: 180 },
  { cdtCode: 'D2391', shortName: 'Composite filling, 1 surface (back)', plainDescription: 'A tooth-colored filling on one side of a back tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 135, ucrFee: 205 },
  { cdtCode: 'D2392', shortName: 'Composite filling, 2 surfaces (back)', plainDescription: 'A tooth-colored filling covering two sides of a back tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 170, ucrFee: 255 },
  { cdtCode: 'D2740', shortName: 'Crown, porcelain/ceramic', plainDescription: 'A full tooth-colored cap that covers and protects a damaged tooth.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 1424, ucrFee: 2050 },
  { cdtCode: 'D2950', shortName: 'Core buildup', plainDescription: 'Rebuilds the inside of a broken-down tooth so a crown can hold on.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 205, ucrFee: 310 },
  { cdtCode: 'D3310', shortName: 'Root canal, front tooth', plainDescription: 'Removes infected nerve tissue from inside a front tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 660, ucrFee: 925 },
  { cdtCode: 'D3330', shortName: 'Root canal, molar', plainDescription: 'Removes infected nerve tissue from inside a back molar.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 960, ucrFee: 1325 },
  { cdtCode: 'D4341', shortName: 'Deep cleaning (per quadrant)', plainDescription: 'Scaling and root planing: cleans below the gum line to treat gum disease.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: false, inNetworkFee: 195, ucrFee: 285 },
  { cdtCode: 'D6010', shortName: 'Implant post', plainDescription: 'A titanium post placed in the jaw to replace a missing tooth root.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 1750, ucrFee: 2450 },
  { cdtCode: 'D6065', shortName: 'Implant crown, ceramic', plainDescription: 'The visible tooth-shaped crown that attaches to an implant.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 1225, ucrFee: 1750 },
  { cdtCode: 'D7140', shortName: 'Simple extraction', plainDescription: 'Removal of a tooth that is fully visible above the gum.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 140, ucrFee: 205 },
  { cdtCode: 'D7240', shortName: 'Wisdom tooth removal (impacted)', plainDescription: 'Removal of a wisdom tooth fully covered by bone.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 390, ucrFee: 565 },
  { cdtCode: 'D9944', shortName: 'Night guard (hard, full arch)', plainDescription: 'A custom guard worn at night to protect teeth from grinding.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: false, inNetworkFee: 410, ucrFee: 615 },
]

export const PROCEDURES: Record<string, CdtProcedure> = Object.fromEntries(
  PROCEDURE_LIST.map((p) => [p.cdtCode, p]),
)

/** benefit_claims for Maya's 2026 enrollment: two check-ups and a toothache exam, $400 in all. */
export const CLAIMS: BenefitClaim[] = [
  { cdtCode: 'D0120', toothNumber: null, serviceDate: '2026-02-10', planPaid: 52, patientPaid: 0 },
  { cdtCode: 'D1110', toothNumber: null, serviceDate: '2026-02-10', planPaid: 88, patientPaid: 0 },
  { cdtCode: 'D0274', toothNumber: null, serviceDate: '2026-02-10', planPaid: 48, patientPaid: 0 },
  { cdtCode: 'D0120', toothNumber: null, serviceDate: '2026-08-20', planPaid: 52, patientPaid: 0 },
  { cdtCode: 'D1110', toothNumber: null, serviceDate: '2026-08-20', planPaid: 88, patientPaid: 0 },
  { cdtCode: 'D0140', toothNumber: 14, serviceDate: '2026-09-28', planPaid: 72, patientPaid: 0 },
]

/** What the demo user types in the Operatory: the procedure their dentist recommended. */
export const SAMPLE_PROCEDURE_INPUT = 'Root canal on tooth #14'

const usedToDate = CLAIMS.reduce((sum, c) => sum + c.planPaid, 0) // 400
const planYearEnd = '2026-12-31'
const daysRemaining = daysUntil(planYearEnd)

/** v_enrollment_benefit_summary row for a plan (days are computed live, like CURRENT_DATE in the view). */
function benefitSummaryFor(plan: InsurancePlan, enrollmentId: string): BenefitSummary {
  const effectiveMaximum = plan.annualMaximum
  return {
    enrollmentId,
    fullName: 'Maya Chen',
    carrierName: plan.carrierName,
    planName: plan.planName,
    planYearStart: '2026-01-01',
    planYearEnd,
    annualMaximum: plan.annualMaximum,
    rolloverBalance: 0,
    effectiveMaximum,
    usedToDate,
    plannedPlanPays: 0,
    remainingMaximum: Math.max(effectiveMaximum - usedToDate, 0),
    deductible: plan.deductibleIndividualIn,
    deductibleMet: 0,
    deductibleRemaining: plan.deductibleIndividualIn,
    daysRemaining,
    benefitsExpiringSoon: daysRemaining <= 90 && effectiveMaximum - usedToDate > 0,
  }
}

export const BENEFIT_SUMMARY = benefitSummaryFor(PLAN, '33333333-3333-4333-8333-000000000001')
export const HIGH_OPTION_BENEFIT_SUMMARY = benefitSummaryFor(HIGH_OPTION_PLAN, '33333333-3333-4333-8333-000000000004')

const usd = (n: number) => `$${n.toLocaleString('en-US')}`

/** What the Bedrock "jargon translator" returns for a plan's summary_of_benefits. */
function jargonFor(plan: InsurancePlan): JargonTranslation[] {
  const max = usd(plan.annualMaximum)
  const percentile = Math.round(plan.oonAllowedRatio * 100)
  return [
    {
      id: 'j-1',
      topic: 'Use it or lose it',
      planText: 'Unused benefits, including the Annual Maximum, do not carry forward to any subsequent Benefit Period.',
      plainEnglish: `Whatever is left of your ${max} yearly maximum on Dec 31 disappears. On Jan 1 you start again with a fresh ${max}.`,
    },
    {
      id: 'j-2',
      topic: 'Deductible',
      planText: `A Calendar Year Deductible of ${usd(plan.deductibleIndividualIn)} per Covered Person (${usd(plan.deductibleIndividualOut)} out-of-network) applies to Class II (Basic) and Class III (Major) services.`,
      plainEnglish: `Each year you pay the first ${usd(plan.deductibleIndividualIn)} of fillings, root canals and crowns before the plan starts sharing the cost. Check-ups and cleanings skip it. You have not met it yet this year.`,
    },
    {
      id: 'j-3',
      topic: 'Out-of-network',
      planText: `Out-of-network claims are adjudicated at the ${percentile}th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing.`,
      plainEnglish: 'Out-of-network dentists can charge more than the plan considers fair. The plan pays its share of the "fair" price; you pay everything above it.',
    },
    {
      id: 'j-4',
      topic: 'Crown frequency',
      planText: 'Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months.',
      plainEnglish: 'Each tooth can get one covered crown every 5 years. Tooth #14 has had none, so its crown is eligible.',
    },
  ]
}

export const JARGON_TRANSLATIONS = jargonFor(PLAN)

export type SamplePlanId = 'preferred' | 'high-option'

export interface SamplePlan {
  id: SamplePlanId
  plan: InsurancePlan
  tiers: Record<CoverageClass, CoverageTier>
  benefits: BenefitSummary
  translations: JargonTranslation[]
  /** One line for the intake sheet. */
  blurb: string
}

/** The sample plans offered at Reception. */
export const SAMPLE_PLANS: Record<SamplePlanId, SamplePlan> = {
  preferred: {
    id: 'preferred',
    plan: PLAN,
    tiers: COVERAGE_TIERS,
    benefits: BENEFIT_SUMMARY,
    translations: JARGON_TRANSLATIONS,
    blurb: 'The walkthrough plan: $400 used so far, deductible not met.',
  },
  'high-option': {
    id: 'high-option',
    plan: HIGH_OPTION_PLAN,
    tiers: HIGH_OPTION_TIERS,
    benefits: HIGH_OPTION_BENEFIT_SUMMARY,
    translations: jargonFor(HIGH_OPTION_PLAN),
    blurb: 'A richer plan: 90% basic, 60% major, same claims.',
  },
}

/**
 * Provider directory for the sample plans (both Lincoln plans share one
 * network). Fictional offices (real Greensboro and Columbus streets) and 555 numbers; in-network status is what the
 * plan would report. Mirrors a future `providers` API response.
 */
/** Straight-line miles between two points (haversine), rounded to a tenth. */
function milesBetween(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10
}

/** Where "near me" is for the Greensboro offices: downtown (27401). */
const GREENSBORO_CENTER: [number, number] = [36.0726, -79.792]

type GreensboroSeed = Omit<Provider, 'id' | 'city' | 'state' | 'distanceMiles'> & { id: string }
const GREENSBORO_SEEDS: GreensboroSeed[] = [
  { id: 'prov-g1', name: 'Dr. Naomi Carter, DDS', practiceName: 'Elm Street Family Dental', specialty: 'General dentistry', inNetwork: true, address: '301 S Elm St', zip: '27401', lat: 36.0708, lng: -79.7912, phone: '(336) 555-0121', acceptingNewPatients: true, rating: 4.8, reviewCount: 203 },
  { id: 'prov-g2', name: 'Dr. Daniel Brooks, DMD', practiceName: 'Friendly Avenue Dental Care', specialty: 'General dentistry', inNetwork: true, address: '3300 Friendly Ave', zip: '27410', lat: 36.0975, lng: -79.8228, phone: '(336) 555-0147', acceptingNewPatients: true, rating: 4.7, reviewCount: 176 },
  { id: 'prov-g3', name: 'Dr. Mei Lin, DDS', practiceName: 'Lawndale Endodontics', specialty: 'Endodontics (root canals)', inNetwork: true, address: '2200 Lawndale Dr', zip: '27408', lat: 36.1098, lng: -79.8084, phone: '(336) 555-0163', acceptingNewPatients: true, rating: 4.9, reviewCount: 92 },
  { id: 'prov-g4', name: 'Dr. Andre Whitfield, DDS', practiceName: 'Piedmont Oral Surgery', specialty: 'Oral surgery', inNetwork: true, address: '1500 W Wendover Ave', zip: '27408', lat: 36.0742, lng: -79.8358, phone: '(336) 555-0188', acceptingNewPatients: false, rating: 4.7, reviewCount: 131 },
  { id: 'prov-g5', name: 'Dr. Camila Ortiz, DMD', practiceName: 'Adams Farm Smiles', specialty: 'General dentistry', inNetwork: true, address: '5100 Lake Brandt Rd', zip: '27455', lat: 36.0182, lng: -79.8583, phone: '(336) 555-0204', acceptingNewPatients: true, rating: 4.6, reviewCount: 118 },
  { id: 'prov-g6', name: 'Dr. Samuel Price, DDS', practiceName: 'Cone Boulevard Prosthodontics', specialty: 'Prosthodontics (crowns & implants)', inNetwork: true, address: '1900 Cone Blvd', zip: '27405', lat: 36.1118, lng: -79.7655, phone: '(336) 555-0231', acceptingNewPatients: true, rating: 4.8, reviewCount: 109 },
  { id: 'prov-g7', name: 'Dr. Tara Nguyen, DMD', practiceName: 'Westover Modern Dentistry', specialty: 'General dentistry', inNetwork: false, address: '800 Westover Terrace', zip: '27408', lat: 36.0905, lng: -79.8472, phone: '(336) 555-0259', acceptingNewPatients: true, rating: 4.4, reviewCount: 64 },
  { id: 'prov-g8', name: 'Dr. Leo Hartman, DDS', practiceName: 'Battleground Pediatric & Family Dental', specialty: 'General dentistry', inNetwork: false, address: '4600 Battleground Ave', zip: '27410', lat: 36.1312, lng: -79.8243, phone: '(336) 555-0284', acceptingNewPatients: true, rating: 4.9, reviewCount: 171 },
]

const GREENSBORO_PROVIDERS: Provider[] = GREENSBORO_SEEDS.map((seed) => ({
  ...seed,
  city: 'Greensboro',
  state: 'NC',
  distanceMiles: milesBetween(GREENSBORO_CENTER, [seed.lat!, seed.lng!]),
}))

export const PROVIDERS: Provider[] = [
  ...GREENSBORO_PROVIDERS,
  { id: 'prov-1', name: 'Dr. Elena Marsh, DDS', practiceName: 'Riverside Family Dental', specialty: 'General dentistry', inNetwork: true, address: '812 Birchwood Ave', city: 'Columbus', state: 'OH', zip: '43215', distanceMiles: 1.2, lat: 39.9640, lng: -83.0220, phone: '(614) 555-0142', acceptingNewPatients: true, rating: 4.8, reviewCount: 212 },
  { id: 'prov-2', name: 'Dr. Priya Nair, DMD', practiceName: 'Downtown Dental Studio', specialty: 'General dentistry', inNetwork: true, address: '45 Market St, Suite 300', city: 'Columbus', state: 'OH', zip: '43215', distanceMiles: 2.6, lat: 40.0000, lng: -83.0020, phone: '(614) 555-0188', acceptingNewPatients: false, rating: 4.6, reviewCount: 164 },
  { id: 'prov-3', name: 'Dr. Marcus Lee, DDS', practiceName: 'Grandview Endodontics', specialty: 'Endodontics (root canals)', inNetwork: true, address: '1290 Grandview Rd', city: 'Grandview Heights', state: 'OH', zip: '43212', distanceMiles: 3.9, lat: 39.9950, lng: -83.0590, phone: '(614) 555-0210', acceptingNewPatients: true, rating: 4.9, reviewCount: 98 },
  { id: 'prov-4', name: 'Dr. Sofia Alvarez, DMD', practiceName: 'Northgate Oral Surgery', specialty: 'Oral surgery', inNetwork: true, address: '7700 Sinclair Rd', city: 'Columbus', state: 'OH', zip: '43235', distanceMiles: 6.1, lat: 40.0480, lng: -83.0250, phone: '(614) 555-0266', acceptingNewPatients: true, rating: 4.7, reviewCount: 143 },
  { id: 'prov-5', name: 'Dr. James Okafor, DDS', practiceName: 'Bexley Dental Group', specialty: 'General dentistry', inNetwork: true, address: '2301 E Main St', city: 'Bexley', state: 'OH', zip: '43209', distanceMiles: 4.4, lat: 39.9560, lng: -82.9200, phone: '(614) 555-0319', acceptingNewPatients: true, rating: 4.5, reviewCount: 87 },
  { id: 'prov-6', name: 'Dr. Hannah Weiss, DMD', practiceName: 'Clintonville Smiles', specialty: 'Prosthodontics (crowns & implants)', inNetwork: true, address: '3540 N High St', city: 'Columbus', state: 'OH', zip: '43214', distanceMiles: 5.0, lat: 40.0330, lng: -83.0170, phone: '(614) 555-0377', acceptingNewPatients: false, rating: 4.8, reviewCount: 121 },
  { id: 'prov-7', name: 'Dr. Robert Chen, DDS', practiceName: 'Easton Modern Dentistry', specialty: 'General dentistry', inNetwork: false, address: '4000 Worth Ave', city: 'Columbus', state: 'OH', zip: '43219', distanceMiles: 7.8, lat: 40.0520, lng: -82.9150, phone: '(614) 555-0401', acceptingNewPatients: true, rating: 4.4, reviewCount: 56 },
  { id: 'prov-8', name: 'Dr. Amara Diallo, DMD', practiceName: 'Upper Arlington Pediatric & Family Dental', specialty: 'General dentistry', inNetwork: false, address: '1515 Lane Ave', city: 'Upper Arlington', state: 'OH', zip: '43221', distanceMiles: 8.3, lat: 40.0225, lng: -83.0640, phone: '(614) 555-0455', acceptingNewPatients: true, rating: 4.9, reviewCount: 189 },
]
