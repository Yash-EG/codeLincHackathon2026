package com.codelinc.dental.service.calc;

import com.codelinc.dental.model.NetworkTier;

import java.math.BigDecimal;

/**
 * A point-in-time snapshot of how much benefit a user has left, for one network.
 *
 * <p>Backend-local input abstraction mirroring the relevant columns of
 * {@code v_enrollment_benefit_summary} ({@code deductible_remaining}, {@code remaining_maximum}).
 * It is an <strong>immutable snapshot</strong> on purpose: the network-comparison phase prices the
 * in- and out-of-network scenarios against the <em>same</em> original snapshot, so a hypothetical
 * estimate must never mutate it. The calculator reads these values and returns the post-estimate
 * remaining benefit on the {@link com.codelinc.dental.dto.BenefitEstimate}; it does not write back.
 *
 * <p>{@code remainingAnnualMaximum} of {@code null} means the plan has no annual maximum (unlimited,
 * typical of DHMO) — the calculator then applies no annual-max cap.
 *
 * @param networkTier            which network this snapshot is for
 * @param remainingDeductible    deductible still owed before coinsurance starts (never negative)
 * @param remainingAnnualMaximum annual maximum still available, or {@code null} if unlimited
 */
public record BenefitUsage(
        NetworkTier networkTier,
        BigDecimal remainingDeductible,
        BigDecimal remainingAnnualMaximum
) {
    public BenefitUsage {
        if (networkTier == null) {
            throw new IllegalArgumentException("networkTier must not be null");
        }
        if (remainingDeductible == null) {
            throw new IllegalArgumentException("remainingDeductible must not be null");
        }
        if (remainingDeductible.signum() < 0) {
            throw new IllegalArgumentException("remainingDeductible must not be negative");
        }
        if (remainingAnnualMaximum != null && remainingAnnualMaximum.signum() < 0) {
            throw new IllegalArgumentException("remainingAnnualMaximum must not be negative");
        }
    }

    /** True if the plan imposes an annual maximum that can cap plan payment. */
    public boolean hasAnnualMaximum() {
        return remainingAnnualMaximum != null;
    }
}
