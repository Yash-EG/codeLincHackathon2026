package com.codelinc.dental.service.calc;

import java.math.BigDecimal;

/**
 * Static plan terms the calculator needs beyond per-procedure coverage.
 *
 * <p>Backend-local input abstraction. It carries the out-of-network allowed ratio derived from
 * {@code insurance_plans.oon_reimbursement_basis}: the fraction of the UCR fee the plan recognizes
 * out-of-network (e.g. {@code UCR_80} → {@code 0.80}). The patient is balance-billed for the
 * remainder of the UCR fee above the allowed amount. In-network has no balance billing, so this ratio
 * is not applied there.
 *
 * @param oonAllowedRatio fraction (0–1) of the UCR fee allowed out-of-network
 */
public record PlanRules(
        BigDecimal oonAllowedRatio
) {
    public PlanRules {
        if (oonAllowedRatio == null) {
            throw new IllegalArgumentException("oonAllowedRatio is required");
        }
        if (oonAllowedRatio.signum() < 0 || oonAllowedRatio.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("oonAllowedRatio must be between 0 and 1, was " + oonAllowedRatio);
        }
    }
}
