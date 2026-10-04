package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.dto.TimingGuidance;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.data.PlanContext;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Produces optional treatment-timing guidance, kept <strong>separate</strong> from the cost
 * estimate. It answers "would doing some of this after the benefit year resets recover benefit the
 * annual maximum would otherwise waste?" — but only when the data actually supports saying so.
 *
 * <p><strong>Guidance is produced only when ALL of these hold:</strong>
 * <ol>
 *   <li>actual plan data is present (a {@link PlanContext} with a benefit-year window);</li>
 *   <li>the benefit year is known (passed in, derived upstream — never hard-coded);</li>
 *   <li>the remaining annual maximum is known (a {@link BenefitUsage} snapshot with a non-null
 *       {@code remainingAnnualMaximum});</li>
 *   <li>the expected treatment timing matters — i.e. the estimate shows plan payment being lost to
 *       the annual-maximum cap this year ({@code overMaximum > 0}), which is exactly what deferring
 *       part of the work past the reset could recover.</li>
 * </ol>
 *
 * <p>If any input is missing or none of the estimates lose benefit to the cap, this returns
 * {@link Optional#empty()} — no guidance. It performs no benefit math and calls no AI; it only
 * reasons over numbers the calculator already produced.
 */
@Service
public class TreatmentTimingService {

    /**
     * Compute timing guidance for a set of estimates, if the data supports it.
     *
     * @param plan        the user's plan context (plan + benefit-year window); may be {@code null}
     * @param benefitYear the applicable benefit year
     * @param usage       the remaining-benefit snapshot used for the estimate; may be {@code null}
     * @param estimates   the authoritative estimates produced for this question
     * @return guidance when all four conditions hold; otherwise {@link Optional#empty()}
     */
    public Optional<TimingGuidance> guidanceFor(PlanContext plan,
                                                int benefitYear,
                                                BenefitUsage usage,
                                                List<BenefitEstimate> estimates) {
        // (1) plan data and (3) remaining maximum must be present.
        if (plan == null || plan.benefitYearEnd() == null) {
            return Optional.empty();
        }
        if (usage == null || !usage.hasAnnualMaximum()) {
            return Optional.empty();
        }
        if (estimates == null || estimates.isEmpty()) {
            return Optional.empty();
        }

        // (4) expected treatment timing matters only if benefit is being lost to the cap this year.
        BigDecimal overMaximum = maxOverMaximum(estimates);
        if (overMaximum.signum() <= 0) {
            return Optional.empty();
        }

        BigDecimal remaining = usage.remainingAnnualMaximum();
        // The maximum resets the day after the plan year ends (the end date is its last day).
        String message = "Doing all of this in " + benefitYear + " would waste about "
                + usd(overMaximum) + " of plan payment, because only "
                + usd(remaining) + " of your annual maximum is left. It resets on "
                + plan.benefitYearEnd().plusDays(1) + ", so scheduling part of the work after that would let "
                + "a fresh annual maximum cover more of it.";

        return Optional.of(new TimingGuidance(
                benefitYear,
                plan.benefitYearEnd(),
                remaining,
                overMaximum,
                message));
    }

    /** The largest per-estimate plan payment lost to the annual-maximum cap. */
    private static BigDecimal maxOverMaximum(List<BenefitEstimate> estimates) {
        BigDecimal max = BigDecimal.ZERO;
        for (BenefitEstimate e : estimates) {
            BigDecimal over = e.overMaximum();
            if (over != null && over.compareTo(max) > 0) {
                max = over;
            }
        }
        return max;
    }

    private static String usd(BigDecimal amount) {
        return "$" + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}
