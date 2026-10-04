package com.codelinc.dental.service.calc;

import com.codelinc.dental.model.NetworkTier;

import java.math.BigDecimal;

/**
 * How one plan covers one procedure under one network, resolved for pricing.
 *
 * <p>This is a <strong>backend-local input abstraction</strong> that mirrors a single row of the
 * {@code v_plan_procedure_coverage} view (overrides already resolved on top of catalog defaults).
 * It is fake-friendly so {@link com.codelinc.dental.service.BenefitCalculatorService} can be tested
 * without a database; Phase 6 maps the real view row into this shape.
 *
 * <p>The per-unit {@code unitFee} already reflects the network: the negotiated
 * {@code in_network_fee} for {@link NetworkTier#IN_NETWORK}, the {@code ucr_fee} for
 * {@link NetworkTier#OUT_OF_NETWORK}. {@code planPaysPct} is the coinsurance for this coverage class
 * on this network ({@code plan_pays_pct_in_network} / {@code plan_pays_pct_out_network}); there is
 * deliberately no default — the calculator must never assume a universal 50%.
 *
 * @param cdtCode        the procedure this coverage is for
 * @param networkTier    which network these terms apply to
 * @param covered        whether the plan covers the procedure at all ({@code is_covered}); exclusions
 *                       mean the plan pays nothing
 * @param planPaysPct    coinsurance percent 0–100 the plan pays for this class on this network
 * @param deductibleApplies whether the deductible is taken before coinsurance for this class
 * @param unitFee        the per-unit fee for this network (negotiated in-network, UCR out-of-network)
 */
public record ProcedureCoverage(
        String cdtCode,
        NetworkTier networkTier,
        boolean covered,
        BigDecimal planPaysPct,
        boolean deductibleApplies,
        BigDecimal unitFee
) {
    public ProcedureCoverage {
        if (networkTier == null) {
            throw new IllegalArgumentException("networkTier must not be null");
        }
        if (planPaysPct == null || unitFee == null) {
            throw new IllegalArgumentException("planPaysPct and unitFee must not be null");
        }
    }
}
