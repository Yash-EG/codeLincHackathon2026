package com.codelinc.dental.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Optional treatment-timing guidance that accompanies an estimate when — and only when — the data
 * supports it.
 *
 * <p>Produced by {@code TreatmentTimingService}, kept deliberately separate from the cost estimate.
 * It is only present when actual plan data, the benefit year, the remaining annual maximum, and the
 * estimate's own numbers show that <em>when</em> the care happens changes what the plan pays
 * (specifically, that part of this year's plan payment would be lost to the annual-maximum cap and
 * could be recovered by doing some of the work after the benefit year resets). When nothing can be
 * said defensibly, no {@code TimingGuidance} is produced at all.
 *
 * <p>This carries no new money math of its own: {@code amountOverMaximumThisYear} is taken straight
 * from the authoritative {@link BenefitEstimate}. The guidance is explanatory, not a second estimate.
 *
 * @param benefitYear               the applicable benefit year the guidance reasons about
 * @param benefitYearEnd            the date the current benefit year ends (the reset boundary)
 * @param remainingMaximumThisYear  annual maximum still available in the current year
 * @param amountOverMaximumThisYear plan payment that would be lost to the annual-maximum cap if all
 *                                  the work is done this year (from the estimate; always &gt; 0 when
 *                                  guidance is present)
 * @param message                   plain-English guidance for the user
 */
public record TimingGuidance(
        int benefitYear,
        LocalDate benefitYearEnd,
        BigDecimal remainingMaximumThisYear,
        BigDecimal amountOverMaximumThisYear,
        String message
) {
}
