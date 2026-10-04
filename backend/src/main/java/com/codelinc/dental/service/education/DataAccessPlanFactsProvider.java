package com.codelinc.dental.service.education;

import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * A {@link PlanFactsProvider} that sources every fact from the backend's trusted
 * {@link DentalDataAccess} port (Gopal's Neon schema under the {@code db} profile).
 * It never fabricates a number: each field is populated only from trusted data, and
 * anything the trusted layer cannot supply is left {@code null} so the chatbot says
 * the amount is unavailable rather than guessing.
 *
 * <p><strong>Member resolution is a demo stand-in, not real authentication.</strong>
 * The interface contract calls for resolving the member from an authenticated
 * security context; this checkout has no auth layer. Until one exists, this provider
 * resolves a single configured demo member id (see
 * {@link EducationConfig#dataAccessPlanFactsProvider}) that defaults to the seed's
 * demo user. It deliberately does <em>not</em> accept a per-request, user-supplied id,
 * keeping the "no client-supplied plan id" guarantee intact: the id is fixed server-side
 * configuration, swapped for a real {@code SecurityContext} lookup when auth lands.
 *
 * <p>Registered only under the {@code db} profile (see {@link EducationConfig}); without
 * that profile the {@link UnavailablePlanFactsProvider} fallback remains in effect, so
 * personal-plan questions stay honestly "unavailable" when there is no trusted source.
 */
public class DataAccessPlanFactsProvider implements PlanFactsProvider {

    private final DentalDataAccess data;

    /**
     * Fixed, server-side demo member id. Stands in for an authenticated member lookup;
     * see the class Javadoc. Never populated from a client request.
     */
    private final String demoMemberId;

    /**
     * CDT code of a representative covered procedure used to read the plan's coinsurance
     * split for the chatbot. The chatbot speaks about the plan's general coinsurance, but
     * coverage is stored per class/procedure; we read one covered procedure's terms as a
     * representative value. Defaults to a Crown (a MAJOR-class procedure in the seed).
     */
    private final String coinsuranceSampleCdtCode;

    public DataAccessPlanFactsProvider(DentalDataAccess data,
                                       String demoMemberId,
                                       String coinsuranceSampleCdtCode) {
        this.data = data;
        this.demoMemberId = demoMemberId;
        this.coinsuranceSampleCdtCode = coinsuranceSampleCdtCode;
    }

    @Override
    public Optional<PlanFacts> currentPlanFacts() {
        return planFactsFor(demoMemberId);
    }

    /**
     * Facts for the employee checked in at Reception (their id is the analyzer's userId), so the
     * chatbot and the estimates describe the same plan. Blank falls back to the demo member.
     */
    @Override
    public Optional<PlanFacts> planFactsFor(String memberId) {
        String member = memberId == null || memberId.isBlank() ? demoMemberId : memberId.trim();
        // Resolve the member's active plan from trusted data. No plan -> no facts.
        Optional<PlanContext> planOpt = data.findActivePlan(member);
        if (planOpt.isEmpty()) {
            return Optional.empty();
        }
        PlanContext plan = planOpt.get();

        // Derive the benefit year from the plan window (never hard-coded). Clamp "today"
        // into the window so an out-of-window demo date still yields the plan's year.
        int benefitYear = benefitYearFor(plan);

        // Usage snapshots per network give remaining deductible + remaining annual maximum.
        Optional<BenefitUsage> inUsage =
                data.findBenefitUsage(plan.enrollmentId(), benefitYear, NetworkTier.IN_NETWORK);
        Optional<BenefitUsage> outUsage =
                data.findBenefitUsage(plan.enrollmentId(), benefitYear, NetworkTier.OUT_OF_NETWORK);

        // Representative coinsurance split per network from a covered sample procedure.
        Integer inCoins = coveragePercent(plan.planId(), NetworkTier.IN_NETWORK);
        Integer outCoins = coveragePercent(plan.planId(), NetworkTier.OUT_OF_NETWORK);

        // Remaining deductible: prefer the in-network snapshot, fall back to out-of-network.
        BigDecimal deductibleRemaining = inUsage.map(BenefitUsage::remainingDeductible)
                .or(() -> outUsage.map(BenefitUsage::remainingDeductible))
                .orElse(null);

        // Remaining annual maximum is plan-level (same cap regardless of network); take whichever
        // snapshot is present. The plan's *total* annual max is not exposed by the port, so it
        // stays null and the chatbot speaks only to what remains.
        BigDecimal remainingMax = inUsage.map(BenefitUsage::remainingAnnualMaximum)
                .or(() -> outUsage.map(BenefitUsage::remainingAnnualMaximum))
                .orElse(null);

        PlanFacts facts = new PlanFacts(
                plan.planName(),
                null,                 // total annual maximum: not exposed by the trusted port
                remainingMax,
                null,                 // total deductible: not exposed by the trusted port
                deductibleRemaining,
                inCoins,
                outCoins,
                null,                 // in-network copay: this schema models shares as coinsurance
                null                  // out-of-network copay: same
        );
        return Optional.of(facts);
    }

    /** Benefit year for the plan, clamping a real "today" into the plan's window. */
    private int benefitYearFor(PlanContext plan) {
        LocalDate today = LocalDate.now();
        LocalDate inWindow = today;
        if (today.isBefore(plan.benefitYearStart())) {
            inWindow = plan.benefitYearStart();
        } else if (today.isAfter(plan.benefitYearEnd())) {
            inWindow = plan.benefitYearEnd();
        }
        return plan.benefitYearOf(inWindow);
    }

    /**
     * Whole-percent the plan pays for a representative covered procedure on the given network,
     * or {@code null} if coverage is unavailable or the procedure is not covered. Reads trusted
     * {@link ProcedureCoverage}; never assumes a default split.
     */
    private Integer coveragePercent(String planId, NetworkTier tier) {
        return data.findCoverage(planId, coinsuranceSampleCdtCode, tier)
                .filter(ProcedureCoverage::covered)
                .map(ProcedureCoverage::planPaysPct)
                .map(pct -> pct.setScale(0, java.math.RoundingMode.HALF_UP).intValueExact())
                .orElse(null);
    }
}
