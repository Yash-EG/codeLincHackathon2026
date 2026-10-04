package com.codelinc.dental.service.education;

import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link DataAccessPlanFactsProvider}. They assert the provider only
 * ever reflects trusted {@link DentalDataAccess} values and never fabricates: fields
 * the port cannot supply stay {@code null}, and no plan context yields no facts.
 */
class DataAccessPlanFactsProviderTest {

    private static final String MEMBER_ID = "1";
    private static final String CROWN_CDT = "D2740";

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    /** Benefit window spanning the current year so LocalDate.now() falls inside it. */
    private static PlanContext planThisYear() {
        int y = Year.now().getValue();
        return new PlanContext("1", "plan-1", "Demo PPO",
                LocalDate.of(y, 1, 1), LocalDate.of(y, 12, 31), new PlanRules(usd("1.00")));
    }

    /** Minimal mutable fake with crown coverage + usage, like AnalysisServiceTest's. */
    private static final class FakeData implements DentalDataAccess {
        PlanContext plan = planThisYear();
        ProcedureCoverage inCoverage =
                new ProcedureCoverage(CROWN_CDT, NetworkTier.IN_NETWORK, true, usd("80"), true, usd("1400.00"));
        ProcedureCoverage outCoverage =
                new ProcedureCoverage(CROWN_CDT, NetworkTier.OUT_OF_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage inUsage =
                new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));
        BenefitUsage outUsage =
                new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("600.00"));

        @Override public Optional<PlanContext> findActivePlan(String userId) {
            return Optional.ofNullable(plan);
        }

        @Override public ProcedureResolution resolveProcedure(String spokenName) {
            throw new UnsupportedOperationException("not used by the provider");
        }

        @Override public Optional<ProcedureCoverage> findCoverage(String planId, String cdtCode, NetworkTier tier) {
            if (inCoverage == null || outCoverage == null) return Optional.empty();
            return Optional.of(tier == NetworkTier.IN_NETWORK ? inCoverage : outCoverage);
        }

        @Override public Optional<BenefitUsage> findBenefitUsage(String enrollmentId, int benefitYear, NetworkTier tier) {
            if (inUsage == null || outUsage == null) return Optional.empty();
            return Optional.of(tier == NetworkTier.IN_NETWORK ? inUsage : outUsage);
        }

        @Override public List<RecentAppointment> findRecentAppointments(String userId) {
            return List.of();
        }
    }

    private DataAccessPlanFactsProvider provider(DentalDataAccess data) {
        return new DataAccessPlanFactsProvider(data, MEMBER_ID, CROWN_CDT);
    }

    @Test
    void returnsVerifiedFactsFromTrustedData() {
        PlanFacts facts = provider(new FakeData()).currentPlanFacts().orElseThrow();

        assertThat(facts.planName()).isEqualTo("Demo PPO");
        assertThat(facts.inNetworkCoinsurancePlanPays()).isEqualTo(80);
        assertThat(facts.outOfNetworkCoinsurancePlanPays()).isEqualTo(50);
        assertThat(facts.remainingAnnualMaximum()).isEqualByComparingTo("600.00");
        assertThat(facts.deductibleRemaining()).isEqualByComparingTo("0.00");
    }

    @Test
    void neverFabricatesFieldsThePortCannotSupply() {
        PlanFacts facts = provider(new FakeData()).currentPlanFacts().orElseThrow();

        // The trusted port exposes no total annual max, total deductible, or copay model.
        assertThat(facts.annualMaximum()).isNull();
        assertThat(facts.deductible()).isNull();
        assertThat(facts.inNetworkCopay()).isNull();
        assertThat(facts.outOfNetworkCopay()).isNull();
        // Schema models shares as coinsurance, so the coinsurance helpers are active.
        assertThat(facts.usesInNetworkCoinsurance()).isTrue();
    }

    @Test
    void noActivePlanYieldsNoFacts() {
        FakeData data = new FakeData();
        data.plan = null;
        assertThat(provider(data).currentPlanFacts()).isEmpty();
    }

    @Test
    void uncoveredProcedureLeavesCoinsuranceNull() {
        FakeData data = new FakeData();
        data.inCoverage =
                new ProcedureCoverage(CROWN_CDT, NetworkTier.IN_NETWORK, false, usd("0"), false, usd("1400.00"));
        PlanFacts facts = provider(data).currentPlanFacts().orElseThrow();

        assertThat(facts.inNetworkCoinsurancePlanPays()).isNull();
        assertThat(facts.outOfNetworkCoinsurancePlanPays()).isEqualTo(50);
    }

    @Test
    void missingUsageLeavesAmountsNull() {
        FakeData data = new FakeData();
        data.inUsage = null;
        data.outUsage = null;
        PlanFacts facts = provider(data).currentPlanFacts().orElseThrow();

        assertThat(facts.remainingAnnualMaximum()).isNull();
        assertThat(facts.deductibleRemaining()).isNull();
    }
}
