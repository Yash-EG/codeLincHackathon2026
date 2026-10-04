package com.codelinc.dental.dto;

import com.codelinc.dental.model.NetworkTier;

import java.math.BigDecimal;

/**
 * A single, structured benefit estimate for one procedure under one network's rules.
 *
 * <p>This is a <strong>backend-owned</strong> contract (produced by {@code BenefitCalculatorService}
 * and surfaced by {@code AnalysisService}). The money fields mirror the frontend {@code CostEstimate}
 * shape in {@code types/domain.ts} ({@code fee, allowed, planPays, patientPays, deductibleApplied,
 * overMaximum}) so this serializes straight into the UI, with backend-only additions for the network
 * label, the resolved procedure identity, the remaining annual benefit after this estimate, and the
 * AI explanation attached in a later phase.
 *
 * <p>Money is {@link BigDecimal} (schema money columns are {@code NUMERIC(10,2)}). Callers are
 * responsible for currency rounding; this record is a transport shape and performs no math.
 *
 * <p><strong>Invariants the producer must uphold</strong> (not enforced here):
 * <ul>
 *   <li>No field is negative (payments and costs are floored at zero).</li>
 *   <li>{@code planPays + patientPays == fee} under the model.</li>
 *   <li>{@code overMaximum} is plan payment lost because the annual maximum ran out.</li>
 * </ul>
 *
 * @param cdtCode            the resolved CDT code this estimate is for (e.g. {@code D2740})
 * @param procedureName      human-readable procedure name (e.g. {@code Crown})
 * @param toothNumber        Universal tooth number (1–32), or {@code null} if not tooth-specific
 * @param networkTier        which network's rules produced this estimate
 * @param fee                the provider's charge: negotiated fee in-network, UCR fee out-of-network
 * @param allowed            the amount the plan recognizes toward coverage
 * @param planPays           what the plan pays, after deductible, coinsurance and annual-maximum cap
 * @param patientPays        what the patient pays ({@code fee - planPays} under the model)
 * @param deductibleApplied  portion of the allowed amount consumed by the remaining deductible
 * @param overMaximum        plan payment lost because the annual maximum was exhausted
 * @param remainingBenefit   annual maximum left after this estimate ({@code null} if plan is unlimited)
 * @param explanation        plain-English explanation from {@code AiService.explainEstimate}; attached
 *                           in a later phase, {@code null} until then. The AI never changes the numbers.
 */
public record BenefitEstimate(
        String cdtCode,
        String procedureName,
        Integer toothNumber,
        NetworkTier networkTier,
        BigDecimal fee,
        BigDecimal allowed,
        BigDecimal planPays,
        BigDecimal patientPays,
        BigDecimal deductibleApplied,
        BigDecimal overMaximum,
        BigDecimal remainingBenefit,
        String explanation
) {
    /**
     * Returns a copy of this estimate with the AI explanation attached. Used in the explanation
     * phase so the authoritative numbers computed by Java are preserved verbatim while the
     * human-readable text is added.
     *
     * @param explanation the plain-English explanation to attach
     * @return a new {@code BenefitEstimate} identical to this one but carrying {@code explanation}
     */
    public BenefitEstimate withExplanation(String explanation) {
        return new BenefitEstimate(
                cdtCode, procedureName, toothNumber, networkTier,
                fee, allowed, planPays, patientPays, deductibleApplied, overMaximum,
                remainingBenefit, explanation);
    }
}
