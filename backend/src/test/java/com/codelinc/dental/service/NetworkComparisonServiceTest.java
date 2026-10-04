package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.NetworkComparison;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCharge;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for {@link NetworkComparisonService}. Uses a real {@link BenefitCalculatorService} so
 * the independence guarantee is proven end-to-end, not against a mock.
 */
class NetworkComparisonServiceTest {

    private final NetworkComparisonService service =
            new NetworkComparisonService(new BenefitCalculatorService());

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    private static ProcedureCoverage coverage(NetworkTier tier, String pct, String unitFee) {
        return new ProcedureCoverage("D2740", tier, true, usd(pct), true, usd(unitFee));
    }

    @Test
    void comparesBothNetworksAndLabelsEachResult() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        // In-network: negotiated fee 1000, 50%. Out-of-network: UCR 1400, 50%, allowed 80%.
        ProcedureCoverage in = coverage(NetworkTier.IN_NETWORK, "50", "1000.00");
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("2000.00"));
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("2000.00"));
        PlanRules plan = new PlanRules(usd("0.80"));

        NetworkComparison result = service.compare(crown, in, out, inUsage, outUsage, plan);

        assertThat(result.inNetwork().networkTier()).isEqualTo(NetworkTier.IN_NETWORK);
        assertThat(result.outOfNetwork().networkTier()).isEqualTo(NetworkTier.OUT_OF_NETWORK);

        // In-network: fee 1000, plan 50% of 1000 = 500, patient 500.
        assertThat(result.inNetwork().fee()).isEqualByComparingTo("1000.00");
        assertThat(result.inNetwork().planPays()).isEqualByComparingTo("500.00");
        assertThat(result.inNetwork().patientPays()).isEqualByComparingTo("500.00");

        // Out-of-network: fee 1400, allowed 1120 (80%), plan 50% of 1120 = 560, patient 1400-560=840.
        assertThat(result.outOfNetwork().fee()).isEqualByComparingTo("1400.00");
        assertThat(result.outOfNetwork().allowed()).isEqualByComparingTo("1120.00");
        assertThat(result.outOfNetwork().planPays()).isEqualByComparingTo("560.00");
        assertThat(result.outOfNetwork().patientPays()).isEqualByComparingTo("840.00");

        assertThat(result.asList()).containsExactly(result.inNetwork(), result.outOfNetwork());
    }

    @Test
    void firstEstimateDoesNotConsumeBenefitsBeforeTheSecondIsCalculated() {
        // Both networks share the SAME remaining annual maximum of 600.
        // In-network would pay 700 pre-cap; if that spent the 600 before the OON calc ran, the
        // OON side would see 0 left. It must instead see the full original 600.
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage in = coverage(NetworkTier.IN_NETWORK, "50", "1400.00");
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00");

        BigDecimal sharedRemainingMax = usd("600.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), sharedRemainingMax);
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), sharedRemainingMax);
        PlanRules plan = new PlanRules(usd("1.00")); // OON allows the full UCR here to isolate the cap

        NetworkComparison result = service.compare(crown, in, out, inUsage, outUsage, plan);

        // In-network capped at 600 (would-be 700).
        assertThat(result.inNetwork().planPays()).isEqualByComparingTo("600.00");
        assertThat(result.inNetwork().overMaximum()).isEqualByComparingTo("100.00");

        // Out-of-network must ALSO be capped at the original 600 — proving the first estimate did
        // not spend the maximum down to 0 before the second ran. If benefits had leaked, this would
        // be 0.00 instead of 600.00.
        assertThat(result.outOfNetwork().planPays()).isEqualByComparingTo("600.00");
        assertThat(result.outOfNetwork().overMaximum()).isEqualByComparingTo("100.00");
        assertThat(result.outOfNetwork().remainingBenefit()).isEqualByComparingTo("0.00");
    }

    @Test
    void eachSideMatchesTheStandaloneCalculatorResult() {
        // The comparison must equal calling the calculator directly for each side.
        BenefitCalculatorService calc = new BenefitCalculatorService();
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage in = coverage(NetworkTier.IN_NETWORK, "80", "900.00");
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "60", "1500.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("50.00"), usd("3000.00"));
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("100.00"), usd("3000.00"));
        PlanRules plan = new PlanRules(usd("0.80"));

        NetworkComparison result = service.compare(crown, in, out, inUsage, outUsage, plan);

        BenefitEstimate expectedIn = calc.calculate(crown, in, inUsage, plan);
        BenefitEstimate expectedOut = calc.calculate(crown, out, outUsage, plan);

        assertThat(result.inNetwork()).isEqualTo(expectedIn);
        assertThat(result.outOfNetwork()).isEqualTo(expectedOut);
    }

    @Test
    void snapshotsAreNotMutatedByTheComparison() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage in = coverage(NetworkTier.IN_NETWORK, "50", "1400.00");
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("25.00"), usd("600.00"));
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("75.00"), usd("800.00"));

        service.compare(crown, in, out, inUsage, outUsage, new PlanRules(usd("0.80")));

        assertThat(inUsage.remainingDeductible()).isEqualByComparingTo("25.00");
        assertThat(inUsage.remainingAnnualMaximum()).isEqualByComparingTo("600.00");
        assertThat(outUsage.remainingDeductible()).isEqualByComparingTo("75.00");
        assertThat(outUsage.remainingAnnualMaximum()).isEqualByComparingTo("800.00");
    }

    @Test
    void differentPerNetworkMaximumsAreHonoredIndependently() {
        // Plan with a separate (smaller) out-of-network annual maximum.
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage in = coverage(NetworkTier.IN_NETWORK, "50", "1400.00");
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("2000.00"));
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("300.00"));
        PlanRules plan = new PlanRules(usd("1.00"));

        NetworkComparison result = service.compare(crown, in, out, inUsage, outUsage, plan);

        assertThat(result.inNetwork().planPays()).isEqualByComparingTo("700.00");  // under 2000 cap
        assertThat(result.outOfNetwork().planPays()).isEqualByComparingTo("300.00"); // hits 300 cap
        assertThat(result.outOfNetwork().overMaximum()).isEqualByComparingTo("400.00");
    }

    @Test
    void rejectsWronglyLabeledArguments() {
        ProcedureCharge crown = new ProcedureCharge("D2740", "Crown", 19);
        ProcedureCoverage inAsOut = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00"); // wrong label
        ProcedureCoverage out = coverage(NetworkTier.OUT_OF_NETWORK, "50", "1400.00");
        BenefitUsage inUsage = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));
        BenefitUsage outUsage = new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("600.00"));

        assertThatThrownBy(() ->
                service.compare(crown, inAsOut, out, inUsage, outUsage, new PlanRules(usd("0.80"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inCoverage");
    }
}
