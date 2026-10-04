package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.dto.TimingGuidance;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.data.PlanContext;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link TreatmentTimingService}. Guidance appears only when actual plan data, the
 * benefit year, the remaining maximum, and the estimate's over-maximum amount all support it.
 */
class TreatmentTimingServiceTest {

    private final TreatmentTimingService timing = new TreatmentTimingService();

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    private static PlanContext plan() {
        return new PlanContext("1", "1", "Demo PPO",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), new PlanRules(BigDecimal.ONE));
    }

    private static BenefitEstimate estimate(String overMaximum) {
        return new BenefitEstimate(
                "D2740", "Crown", 19, NetworkTier.IN_NETWORK,
                usd("1400.00"), usd("1400.00"), usd("600.00"), usd("800.00"),
                BigDecimal.ZERO, usd(overMaximum), usd("0.00"), null);
    }

    @Test
    void producesGuidanceWhenBenefitIsLostToTheAnnualMaximum() {
        BenefitUsage usage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));

        Optional<TimingGuidance> result =
                timing.guidanceFor(plan(), 2026, usage, List.of(estimate("100.00")));

        assertThat(result).isPresent();
        TimingGuidance g = result.get();
        assertThat(g.benefitYear()).isEqualTo(2026);
        assertThat(g.benefitYearEnd()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(g.remainingMaximumThisYear()).isEqualByComparingTo("600.00");
        assertThat(g.amountOverMaximumThisYear()).isEqualByComparingTo("100.00");
        assertThat(g.message()).contains("2026").contains("resets");
    }

    @Test
    void noGuidanceWhenNothingIsLostToTheMaximum() {
        BenefitUsage usage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("5000.00"));

        Optional<TimingGuidance> result =
                timing.guidanceFor(plan(), 2026, usage, List.of(estimate("0.00")));

        assertThat(result).isEmpty();
    }

    @Test
    void noGuidanceWhenPlanIsMissing() {
        BenefitUsage usage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));

        assertThat(timing.guidanceFor(null, 2026, usage, List.of(estimate("100.00")))).isEmpty();
    }

    @Test
    void noGuidanceWhenRemainingMaximumIsUnknown() {
        // Unlimited plan: no annual maximum means timing-vs-maximum guidance is meaningless.
        BenefitUsage unlimited = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), null);

        assertThat(timing.guidanceFor(plan(), 2026, unlimited, List.of(estimate("100.00")))).isEmpty();
    }

    @Test
    void noGuidanceWhenUsageSnapshotIsMissing() {
        assertThat(timing.guidanceFor(plan(), 2026, null, List.of(estimate("100.00")))).isEmpty();
    }

    @Test
    void noGuidanceWhenThereAreNoEstimates() {
        BenefitUsage usage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));

        assertThat(timing.guidanceFor(plan(), 2026, usage, List.of())).isEmpty();
        assertThat(timing.guidanceFor(plan(), 2026, usage, null)).isEmpty();
    }

    @Test
    void usesTheLargestOverMaximumAcrossEstimates() {
        BenefitUsage usage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));

        Optional<TimingGuidance> result = timing.guidanceFor(
                plan(), 2026, usage, List.of(estimate("100.00"), estimate("250.00")));

        assertThat(result).isPresent();
        assertThat(result.get().amountOverMaximumThisYear()).isEqualByComparingTo("250.00");
    }
}
