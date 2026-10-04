// Mock data for the demo user (Maya Chen / Premier PPO). Values match
// db/migrations/V2__seed_mock_data.sql so swapping to the real API is a
// drop-in change: replace these exports with fetches to the Spring Boot backend.

import type {
  BenefitClaim,
  BenefitSummary,
  CdtProcedure,
  CoverageClass,
  CoverageTier,
  InsurancePlan,
  JargonTranslation,
  Provider,
  TreatmentPlanItem,
} from '../types/domain'
import { daysUntil } from '../lib/format'

export const PLAN: InsurancePlan = {
  id: '22222222-2222-4222-8222-000000000002',
  carrierName: 'Ivorycrest Mutual',
  planName: 'Premier PPO',
  planType: 'PPO',
  annualMaximum: 2000,
  deductibleIndividualIn: 50,
  deductibleIndividualOut: 100,
  rolloverEnabled: true,
  oonAllowedRatio: 0.8,
  summaryOfBenefits:
    'The Annual Benefit Maximum of $2,000 per Covered Person applies to all Classes of service combined, in- and out-of-network. Under the Maximum Rollover provision, if paid claims during the Benefit Period do not exceed the Threshold of $1,000, $500 is credited to the Rollover Account, not to exceed the Rollover Account Limit of $1,250. Endodontic services are reimbursed under Class II (Basic) Coinsurance. Out-of-network claims are adjudicated at the 80th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing. Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months. Unused benefits, including the Annual Maximum, do not carry forward except as provided under the Maximum Rollover provision.',
}

export const COVERAGE_TIERS: Record<CoverageClass, CoverageTier> = {
  PREVENTIVE: { coverageClass: 'PREVENTIVE', planPaysPctInNetwork: 100, planPaysPctOutNetwork: 100, deductibleApplies: false, waitingPeriodMonths: 0 },
  BASIC: { coverageClass: 'BASIC', planPaysPctInNetwork: 80, planPaysPctOutNetwork: 70, deductibleApplies: true, waitingPeriodMonths: 0 },
  MAJOR: { coverageClass: 'MAJOR', planPaysPctInNetwork: 50, planPaysPctOutNetwork: 40, deductibleApplies: true, waitingPeriodMonths: 0 },
  ORTHODONTIC: { coverageClass: 'ORTHODONTIC', planPaysPctInNetwork: 50, planPaysPctOutNetwork: 50, deductibleApplies: false, waitingPeriodMonths: 0 },
}

/** v_plan_procedure_coverage rows for Premier PPO, NATIONAL fee region. */
const PROCEDURE_LIST: CdtProcedure[] = [
  { cdtCode: 'D0120', shortName: 'Periodic oral evaluation', plainDescription: 'Routine check-up exam for an existing patient.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 2, inNetworkFee: 52, ucrFee: 75 },
  { cdtCode: 'D0140', shortName: 'Limited oral evaluation', plainDescription: 'A focused exam for one problem, like a toothache or chipped tooth.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, inNetworkFee: 72, ucrFee: 105 },
  { cdtCode: 'D0274', shortName: 'Bitewing X-rays (4 films)', plainDescription: 'X-rays that look for cavities between the back teeth.', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 1, inNetworkFee: 58, ucrFee: 85 },
  { cdtCode: 'D1110', shortName: 'Adult cleaning', plainDescription: 'Routine professional teeth cleaning (prophylaxis).', coverageClass: 'PREVENTIVE', isCovered: true, isToothSpecific: false, frequencyPerYear: 2, inNetworkFee: 88, ucrFee: 125 },
  { cdtCode: 'D2330', shortName: 'Composite filling, 1 surface (front)', plainDescription: 'A tooth-colored filling on one side of a front tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 120, ucrFee: 180 },
  { cdtCode: 'D2391', shortName: 'Composite filling, 1 surface (back)', plainDescription: 'A tooth-colored filling on one side of a back tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 135, ucrFee: 205 },
  { cdtCode: 'D2392', shortName: 'Composite filling, 2 surfaces (back)', plainDescription: 'A tooth-colored filling covering two sides of a back tooth.', coverageClass: 'BASIC', isCovered: true, isToothSpecific: true, inNetworkFee: 170, ucrFee: 255 },
  { cdtCode: 'D2740', shortName: 'Crown, porcelain/ceramic', plainDescription: 'A full tooth-colored cap that covers and protects a damaged tooth.', coverageClass: 'MAJOR', isCovered: true, isToothSpecific: true, inNetworkFee: 925, ucrFee: 1375 },
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

/** benefit_claims for Maya's 2026 enrollment. */
export const CLAIMS: BenefitClaim[] = [
  { cdtCode: 'D0120', toothNumber: null, serviceDate: '2026-02-10', planPaid: 52, patientPaid: 0 },
  { cdtCode: 'D1110', toothNumber: null, serviceDate: '2026-02-10', planPaid: 88, patientPaid: 0 },
  { cdtCode: 'D0274', toothNumber: null, serviceDate: '2026-02-10', planPaid: 58, patientPaid: 0 },
  { cdtCode: 'D0140', toothNumber: 19, serviceDate: '2026-05-06', planPaid: 72, patientPaid: 0 },
  { cdtCode: 'D3330', toothNumber: 19, serviceDate: '2026-05-14', planPaid: 728, patientPaid: 232 },
  { cdtCode: 'D2391', toothNumber: 3, serviceDate: '2026-06-03', planPaid: 108, patientPaid: 27 },
  { cdtCode: 'D0120', toothNumber: null, serviceDate: '2026-08-20', planPaid: 52, patientPaid: 0 },
  { cdtCode: 'D1110', toothNumber: null, serviceDate: '2026-08-20', planPaid: 88, patientPaid: 0 },
]

/** treatment_plan_items: the AI-sequenced plan generated so far. */
export const TREATMENT_PLAN: TreatmentPlanItem[] = [
  { id: 'tp-1', cdtCode: 'D2950', toothNumber: 19, surfaces: null, status: 'PROPOSED', urgency: 'SOON', recommendedDate: '2026-11-12', sequenceOrder: 1, aiRationale: 'Tooth #19 had a root canal in May and needs a buildup before the crown.' },
  { id: 'tp-2', cdtCode: 'D2740', toothNumber: 19, surfaces: null, status: 'PROPOSED', urgency: 'SOON', recommendedDate: '2026-11-12', sequenceOrder: 2, aiRationale: 'Root-canal-treated molars can fracture without a crown. Doing it before Dec 31 uses 2026 dollars.' },
  { id: 'tp-3', cdtCode: 'D2392', toothNumber: 30, surfaces: 'MO', status: 'PROPOSED', urgency: 'SOON', recommendedDate: '2026-12-08', sequenceOrder: 3, aiRationale: 'A two-surface filling is Basic (80%) and still fits under the 2026 maximum after the crown.' },
  { id: 'tp-4', cdtCode: 'D1110', toothNumber: null, surfaces: null, status: 'PROPOSED', urgency: 'ELECTIVE', recommendedDate: '2027-02-15', sequenceOrder: 4, aiRationale: 'Both 2026 cleanings are used. The next one is free once the 2027 benefit period starts.' },
]

const usedToDate = CLAIMS.reduce((sum, c) => sum + c.planPaid, 0) // 1246
const planYearEnd = '2026-12-31'
const effectiveMaximum = PLAN.annualMaximum + 250
const daysRemaining = daysUntil(planYearEnd)

/** v_enrollment_benefit_summary row (days are computed live, like CURRENT_DATE in the view). */
export const BENEFIT_SUMMARY: BenefitSummary = {
  enrollmentId: '33333333-3333-4333-8333-000000000001',
  fullName: 'Maya Chen',
  carrierName: PLAN.carrierName,
  planName: PLAN.planName,
  planYearStart: '2026-01-01',
  planYearEnd,
  annualMaximum: PLAN.annualMaximum,
  rolloverBalance: 250,
  effectiveMaximum,
  usedToDate,
  plannedPlanPays: 701,
  remainingMaximum: Math.max(effectiveMaximum - usedToDate, 0),
  deductible: PLAN.deductibleIndividualIn,
  deductibleMet: 50,
  deductibleRemaining: 0,
  daysRemaining,
  benefitsExpiringSoon: daysRemaining <= 90 && effectiveMaximum - usedToDate > 0,
}

/** What the Bedrock "jargon translator" returns for this plan's summary_of_benefits. */
export const JARGON_TRANSLATIONS: JargonTranslation[] = [
  {
    id: 'j-1',
    topic: 'Use it or lose it',
    planText: 'Unused benefits, including the Annual Maximum, do not carry forward except as provided under the Maximum Rollover provision.',
    plainEnglish: 'Whatever is left of your yearly maximum on Dec 31 disappears. Only the rollover bonus below carries into next year.',
  },
  {
    id: 'j-2',
    topic: 'Rollover',
    planText: 'If paid claims during the Benefit Period do not exceed the Threshold of $1,000, $500 is credited to the Rollover Account, not to exceed the Rollover Account Limit of $1,250.',
    plainEnglish: 'Light years are rewarded: if the plan pays less than $1,000 for you, $500 is banked for later (up to $1,250). You carried $250 into 2026.',
  },
  {
    id: 'j-3',
    topic: 'Out-of-network',
    planText: 'Out-of-network claims are adjudicated at the 80th percentile of Usual, Customary and Reasonable (UCR) charges; Member is responsible for any balance billing.',
    plainEnglish: 'Out-of-network dentists can charge more than the plan considers fair. The plan pays its share of the "fair" price; you pay everything above it.',
  },
  {
    id: 'j-4',
    topic: 'Crown frequency',
    planText: 'Crowns, inlays, onlays and fixed prosthetics are limited to one (1) per tooth per sixty (60) months.',
    plainEnglish: 'Each tooth can get one covered crown every 5 years. Tooth #19 has had none, so its crown is eligible.',
  },
]

/**
 * Provider directory for Premier PPO. Fictional offices; in-network status is
 * what the plan would report. Mirrors a future `providers` API response.
 */
export const PROVIDERS: Provider[] = [
  { id: 'prov-1', name: 'Dr. Elena Marsh, DDS', practiceName: 'Riverside Family Dental', specialty: 'General dentistry', inNetwork: true, address: '812 Birchwood Ave', city: 'Columbus', state: 'OH', zip: '43215', distanceMiles: 1.2, phone: '(614) 555-0142', acceptingNewPatients: true, rating: 4.8, reviewCount: 212 },
  { id: 'prov-2', name: 'Dr. Priya Nair, DMD', practiceName: 'Downtown Dental Studio', specialty: 'General dentistry', inNetwork: true, address: '45 Market St, Suite 300', city: 'Columbus', state: 'OH', zip: '43215', distanceMiles: 2.6, phone: '(614) 555-0188', acceptingNewPatients: false, rating: 4.6, reviewCount: 164 },
  { id: 'prov-3', name: 'Dr. Marcus Lee, DDS', practiceName: 'Grandview Endodontics', specialty: 'Endodontics (root canals)', inNetwork: true, address: '1290 Grandview Rd', city: 'Grandview Heights', state: 'OH', zip: '43212', distanceMiles: 3.9, phone: '(614) 555-0210', acceptingNewPatients: true, rating: 4.9, reviewCount: 98 },
  { id: 'prov-4', name: 'Dr. Sofia Alvarez, DMD', practiceName: 'Northgate Oral Surgery', specialty: 'Oral surgery', inNetwork: true, address: '7700 Sinclair Rd', city: 'Columbus', state: 'OH', zip: '43235', distanceMiles: 6.1, phone: '(614) 555-0266', acceptingNewPatients: true, rating: 4.7, reviewCount: 143 },
  { id: 'prov-5', name: 'Dr. James Okafor, DDS', practiceName: 'Bexley Dental Group', specialty: 'General dentistry', inNetwork: true, address: '2301 E Main St', city: 'Bexley', state: 'OH', zip: '43209', distanceMiles: 4.4, phone: '(614) 555-0319', acceptingNewPatients: true, rating: 4.5, reviewCount: 87 },
  { id: 'prov-6', name: 'Dr. Hannah Weiss, DMD', practiceName: 'Clintonville Smiles', specialty: 'Prosthodontics (crowns & implants)', inNetwork: true, address: '3540 N High St', city: 'Columbus', state: 'OH', zip: '43214', distanceMiles: 5.0, phone: '(614) 555-0377', acceptingNewPatients: false, rating: 4.8, reviewCount: 121 },
  { id: 'prov-7', name: 'Dr. Robert Chen, DDS', practiceName: 'Easton Modern Dentistry', specialty: 'General dentistry', inNetwork: false, address: '4000 Worth Ave', city: 'Columbus', state: 'OH', zip: '43219', distanceMiles: 7.8, phone: '(614) 555-0401', acceptingNewPatients: true, rating: 4.4, reviewCount: 56 },
  { id: 'prov-8', name: 'Dr. Amara Diallo, DMD', practiceName: 'Upper Arlington Pediatric & Family Dental', specialty: 'General dentistry', inNetwork: false, address: '1515 Lane Ave', city: 'Upper Arlington', state: 'OH', zip: '43221', distanceMiles: 8.3, phone: '(614) 555-0455', acceptingNewPatients: true, rating: 4.9, reviewCount: 189 },
]
