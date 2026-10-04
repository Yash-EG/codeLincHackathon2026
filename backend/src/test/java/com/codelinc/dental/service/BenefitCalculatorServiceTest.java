package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCharge;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link BenefitCalculatorService}. Pure math, no Spring context, fake inputs only.
 *
 * <p>Every money assertion uses {@code isEqualByComparingTo} so scale differences (e.g. {@code 600}
 * vs {@code 600.00}) do not mask correct values. The core invariant {@code planPays + patientPays ==
 * fee} is checked in each scenario.
 */
class BenefitCalculatorServiceTest {

    private final BenefitCalculatorService calculator = new BenefitCalculatorService();

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    /** Asserts the fundamental identity holds exactly. */
    private static void assertPaymentSplitAddsUp(BenefitEstimate e) {
        assertThat(e.planPays().add(e.patientPays()))
                .as("planPays + patientPays must equal fee")
                .isEqualByComparingTo(e.fee());
        assertThat(e.planPays().signum()).as("planPays not negative").isGreaterThanOrEqualTo(0);
        assertThat(e.patientPays().signum()).as("patientPays not negative").isGreaterThanOrEqualTo(0);
    }

    // ---- The headline scenario from the task ---------------------------------------------------

    @Test
    void crownWhosePaymentExceedsRemainingMaximumIsCappedAtTheMaximum() {
        // $1,400 crown, MAJOR 50% in-network, deductible already met.
        // Rules yield $700 before the cap, but only $600 of annual maximum remains.
        // Expect: $600 insurance, $800 patient, $100 lost to the maximum.
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));
        PlanRules plan = new PlanRules(usd("0.80"));

        BenefitEstimate e = calculator.calculate(crown, coverage, usage, plan);

        assertThat(e.fee()).isEqualByComparingTo("1400.00");
        assertThat(e.allowed()).isEqualByComparingTo("1400.00");
        assertThat(e.deductibleApplied()).isEqualByComparingTo("0.00");
        assertThat(e.planPays()).isEqualByComparingTo("600.00");    // capped from 700
        assertThat(e.patientPays()).isEqualByComparingTo("800.00");
        assertThat(e.overMaximum()).isEqualByComparingTo("100.00"); // 700 - 600
        assertThat(e.remainingBenefit()).isEqualByComparingTo("0.00");
        assertPaymentSplitAddsUp(e);
    }

    // ---- Depleted annual maximum ---------------------------------------------------------------

    @Test
    void depletedAnnualMaximumMeansPlanPaysNothingAndPatientPaysEverything() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("0.00"), usd("0.00")); // nothing left
        PlanRules plan = new PlanRules(usd("0.80"));

        BenefitEstimate e = calculator.calculate(crown, coverage, usage, plan);

        assertThat(e.planPays()).isEqualByComparingTo("0.00");
        assertThat(e.patientPays()).isEqualByComparingTo("1400.00");
        assertThat(e.overMaximum()).isEqualByComparingTo("700.00"); // all of the would-be payment lost
        assertThat(e.remainingBenefit()).isEqualByComparingTo("0.00");
        assertPaymentSplitAddsUp(e);
    }

    // ---- Remaining deductible comes off the allowed amount first -------------------------------

    @Test
    void remainingDeductibleIsTakenBeforeCoinsurance() {
        // $200 basic filling, 80% in-network, $50 deductible still owed, class applies deductible.
        // allowed 200 - 50 deductible = 150 base; plan pays 80% = 120; patient pays 80.
        ProcedureCharge filling = new ProcedureCharge("D2391", "Filling", 30);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2391", NetworkTier.IN_NETWORK, true, usd("80"), true, usd("200.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("50.00"), usd("1500.00"));
        PlanRules plan = new PlanRules(usd("0.80"));

        BenefitEstimate e = calculator.calculate(filling, coverage, usage, plan);

        assertThat(e.deductibleApplied()).isEqualByComparingTo("50.00");
        assertThat(e.planPays()).isEqualByComparingTo("120.00");
        assertThat(e.patientPays()).isEqualByComparingTo("80.00");
        assertThat(e.overMaximum()).isEqualByComparingTo("0.00");
        assertThat(e.remainingBenefit()).isEqualByComparingTo("1380.00"); // 1500 - 120
        assertPaymentSplitAddsUp(e);
    }

    @Test
    void deductibleIsNotAppliedWhenTheClassDoesNotApplyIt() {
        // Preventive cleaning, 100%, deductible does not apply.
        ProcedureCharge cleaning = new ProcedureCharge("D1110", "Cleaning", null);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D1110", NetworkTier.IN_NETWORK, true, usd("100"), false, usd("120.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("50.00"), usd("1500.00"));

        BenefitEstimate e = calculator.calculate(cleaning, coverage, usage, new PlanRules(usd("0.80")));

        assertThat(e.deductibleApplied()).isEqualByComparingTo("0.00");
        assertThat(e.planPays()).isEqualByComparingTo("120.00");
        assertThat(e.patientPays()).isEqualByComparingTo("0.00");
        assertPaymentSplitAddsUp(e);
    }

    // ---- Out-of-network balance billing --------------------------------------------------------

    @Test
    void outOfNetworkAppliesAllowedRatioAndBalanceBillsTheRemainder() {
        // UCR fee $1000, plan allows 80% ($800) out-of-network, 50% coinsurance, deductible met.
        // plan pays 50% of 800 = 400; patient pays fee(1000) - 400 = 600 (incl. $200 balance bill).
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2740", NetworkTier.OUT_OF_NETWORK, true, usd("50"), true, usd("1000.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("2000.00"));
        PlanRules plan = new PlanRules(usd("0.80"));

        BenefitEstimate e = calculator.calculate(crown, coverage, usage, plan);

        assertThat(e.fee()).isEqualByComparingTo("1000.00");
        assertThat(e.allowed()).isEqualByComparingTo("800.00");
        assertThat(e.planPays()).isEqualByComparingTo("400.00");
        assertThat(e.patientPays()).isEqualByComparingTo("600.00");
        assertThat(e.networkTier()).isEqualTo(NetworkTier.OUT_OF_NETWORK);
        assertPaymentSplitAddsUp(e);
    }

    // ---- Not covered ---------------------------------------------------------------------------

    @Test
    void notCoveredProcedurePaysNothing() {
        ProcedureCharge implant = new ProcedureCharge("D6010", "Implant", 19);
        ProcedureCoverage excluded = new ProcedureCoverage(
                "D6010", NetworkTier.IN_NETWORK, false, usd("0"), true, usd("2500.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("0.00"), usd("1500.00"));

        BenefitEstimate e = calculator.calculate(implant, excluded, usage, new PlanRules(usd("0.80")));

        assertThat(e.planPays()).isEqualByComparingTo("0.00");
        assertThat(e.patientPays()).isEqualByComparingTo("2500.00");
        assertThat(e.remainingBenefit()).isEqualByComparingTo("1500.00"); // untouched
        assertPaymentSplitAddsUp(e);
    }

    // ---- Unlimited plan (no annual maximum) ----------------------------------------------------

    @Test
    void unlimitedPlanAppliesNoAnnualMaximumCapAndReturnsNullRemainingBenefit() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage unlimited = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("0.00"), null); // no annual maximum

        BenefitEstimate e = calculator.calculate(crown, coverage, unlimited, new PlanRules(usd("0.80")));

        assertThat(e.planPays()).isEqualByComparingTo("700.00"); // uncapped
        assertThat(e.overMaximum()).isEqualByComparingTo("0.00");
        assertThat(e.remainingBenefit()).isNull();
        assertPaymentSplitAddsUp(e);
    }

    // ---- Snapshot is never mutated -------------------------------------------------------------

    @Test
    void usageSnapshotIsNotMutated() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("100.00"), usd("1500.00"));

        calculator.calculate(crown, coverage, usage, new PlanRules(usd("0.80")));

        // Records are immutable; confirm the original values are intact for reuse by comparison phase.
        assertThat(usage.remainingDeductible()).isEqualByComparingTo("100.00");
        assertThat(usage.remainingAnnualMaximum()).isEqualByComparingTo("1500.00");
    }

    // ---- Rounding ------------------------------------------------------------------------------

    @Test
    void coinsuranceIsRoundedToCentsHalfUp() {
        // allowed 100.01 * 50% = 50.005 -> 50.01 (HALF_UP).
        ProcedureCharge p = new ProcedureCharge("D0000", "Odd", null);
        ProcedureCoverage coverage = new ProcedureCoverage(
                "D0000", NetworkTier.IN_NETWORK, true, usd("50"), false, usd("100.01"));
        BenefitUsage usage = new BenefitUsage(
                NetworkTier.IN_NETWORK, usd("0.00"), usd("1000.00"));

        BenefitEstimate e = calculator.calculate(p, coverage, usage, new PlanRules(usd("0.80")));

        assertThat(e.planPays()).isEqualByComparingTo("50.01");
        assertThat(e.patientPays()).isEqualByComparingTo("50.00"); // 100.01 - 50.01
        assertPaymentSplitAddsUp(e);
    }

    // ---- Guard: mismatched networks ------------------------------------------------------------

    @Test
    void mismatchedCoverageAndUsageNetworksAreRejected() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage inNet = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage outNetUsage = new BenefitUsage(
                NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("600.00"));

        assertThatThrownBy(() -> calculator.calculate(crown, inNet, outNetUsage, new PlanRules(usd("0.80"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("network");
    }
}
