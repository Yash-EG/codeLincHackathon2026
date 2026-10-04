package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCharge;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Computes a single, authoritative {@link BenefitEstimate} for one procedure under one network's
 * rules. This is backend logic; it owns the numbers. The AI never calculates or modifies them.
 *
 * <p><strong>Model applied</strong> (only rules actually represented in the Neon schema / views):
 * <ol>
 *   <li>Fee: in-network uses the negotiated fee; out-of-network uses the UCR fee (carried on
 *       {@link ProcedureCoverage#unitFee()} for the matching network).</li>
 *   <li>Allowed amount: in-network equals the fee; out-of-network equals {@code fee ×
 *       oonAllowedRatio} ({@code oon_reimbursement_basis}), with the remainder balance-billed to the
 *       patient.</li>
 *   <li>Deductible: taken off the allowed amount first, but only when the procedure is covered and
 *       the coverage class applies a deductible.</li>
 *   <li>Coinsurance: the plan pays its {@code plan_pays_pct} of the post-deductible allowed amount.
 *       There is no universal default percentage; an excluded procedure pays nothing.</li>
 *   <li>Annual maximum: plan payment is capped at the remaining annual maximum. The shortfall is
 *       reported as {@code overMaximum}. A {@code null} remaining maximum means unlimited.</li>
 * </ol>
 *
 * <p><strong>Guarantees</strong>: all money is {@link BigDecimal} rounded to cents
 * ({@link RoundingMode#HALF_UP}); no field is ever negative; and {@code planPays + patientPays ==
 * fee} holds exactly.
 *
 * <p>This service is pure and stateless: it reads the {@link BenefitUsage} snapshot but never mutates
 * it, so the same snapshot can be reused to price multiple hypothetical scenarios independently
 * (used by the network-comparison phase).
 */
@Service
public class BenefitCalculatorService {

    /** Scale for currency values: cents. */
    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_ROUNDING = RoundingMode.HALF_UP;
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = money(BigDecimal.ZERO);

    /**
     * Calculate the benefit estimate for one procedure under one network.
     *
     * @param charge   the procedure to price (CDT code, tooth)
     * @param coverage how the plan covers this procedure on {@code usage}'s network (fee, coinsurance,
     *                 deductible rule, covered flag)
     * @param usage    the remaining-benefit snapshot for the same network (not mutated)
     * @param plan     static plan terms (out-of-network allowed ratio)
     * @return a fully populated {@link BenefitEstimate}
     * @throws IllegalArgumentException if the coverage and usage networks disagree
     */
    public BenefitEstimate calculate(ProcedureCharge charge,
                                     ProcedureCoverage coverage,
                                     BenefitUsage usage,
                                     PlanRules plan) {
        if (coverage.networkTier() != usage.networkTier()) {
            throw new IllegalArgumentException(
                    "coverage network " + coverage.networkTier()
                            + " does not match usage network " + usage.networkTier());
        }
        NetworkTier network = coverage.networkTier();

        // 1. Fee.
        BigDecimal fee = money(coverage.unitFee());

        // 2. Allowed amount.
        BigDecimal allowed = network == NetworkTier.OUT_OF_NETWORK
                ? money(fee.multiply(plan.oonAllowedRatio()))
                : fee; // in-network: the negotiated fee is the allowed amount; no balance billing

        // Excluded / not covered: plan pays nothing, patient pays the whole fee.
        if (!coverage.covered()) {
            return build(charge, network, fee, allowed, /*deductibleApplied*/ ZERO,
                    /*uncappedPlanPays*/ ZERO, /*planPays*/ ZERO, usage);
        }

        // 3. Deductible off the allowed amount first, when the class applies it.
        BigDecimal deductibleApplied = coverage.deductibleApplies()
                ? min(usage.remainingDeductible(), allowed)
                : ZERO;

        // 4. Coinsurance on the post-deductible allowed amount.
        BigDecimal coinsuranceBase = allowed.subtract(deductibleApplied).max(BigDecimal.ZERO);
        BigDecimal uncappedPlanPays = money(
                coinsuranceBase.multiply(coverage.planPaysPct()).divide(HUNDRED, 10, MONEY_ROUNDING));

        // 5. Cap at the remaining annual maximum (if any).
        BigDecimal planPays = usage.hasAnnualMaximum()
                ? min(uncappedPlanPays, usage.remainingAnnualMaximum())
                : uncappedPlanPays;
        planPays = planPays.max(BigDecimal.ZERO); // never negative

        return build(charge, network, fee, allowed, deductibleApplied, uncappedPlanPays, planPays, usage);
    }

    private BenefitEstimate build(ProcedureCharge charge,
                                  NetworkTier network,
                                  BigDecimal fee,
                                  BigDecimal allowed,
                                  BigDecimal deductibleApplied,
                                  BigDecimal uncappedPlanPays,
                                  BigDecimal planPays,
                                  BenefitUsage usage) {
        BigDecimal cappedPlanPays = money(planPays);
        // overMaximum = plan payment lost to the annual-maximum cap (never negative).
        BigDecimal overMaximum = money(uncappedPlanPays.subtract(cappedPlanPays)).max(ZERO);
        // Identity: patientPays = fee - planPays, so planPays + patientPays == fee exactly.
        BigDecimal patientPays = money(fee.subtract(cappedPlanPays)).max(ZERO);

        BigDecimal remainingBenefit = null;
        if (usage.hasAnnualMaximum()) {
            remainingBenefit = money(usage.remainingAnnualMaximum().subtract(cappedPlanPays)).max(ZERO);
        }

        return new BenefitEstimate(
                charge.cdtCode(),
                charge.procedureName(),
                charge.toothNumber(),
                network,
                fee,
                money(allowed),
                cappedPlanPays,
                patientPays,
                money(deductibleApplied),
                overMaximum,
                remainingBenefit,
                /*explanation attached in a later phase*/ null);
    }

    private static BigDecimal min(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) <= 0 ? a : b;
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(MONEY_SCALE, MONEY_ROUNDING);
    }
}
