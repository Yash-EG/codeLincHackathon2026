package com.codelinc.dental.service;

import com.codelinc.dental.dto.AnalysisResponse;
import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.DentalIntentType;
import com.codelinc.dental.intent.IntentExtractor;
import com.codelinc.dental.intent.ProcedureReference;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.NetworkComparison;
import com.codelinc.dental.service.calc.ProcedureCharge;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import com.codelinc.dental.service.data.ResolvedProcedure;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Orchestrates a natural-language dental-cost question into a structured {@link AnalysisResponse}.
 *
 * <p>The AI is used only to <em>interpret</em> the message into a {@link DentalIntent}. Every
 * actionable part of that intent is then verified against trusted data before anything is priced:
 * the procedure is resolved against the trusted catalog (not the AI's guessed code), a claimed
 * recommendation is confirmed against the user's recent appointments, and the plan, benefit-year
 * usage and coverage are loaded from the data layer. <strong>No price, coverage, or recommendation
 * ever comes from the AI.</strong> The authoritative numbers are produced by
 * {@link BenefitCalculatorService} / {@link NetworkComparisonService}.
 *
 * <p>When any precondition is not met, the service returns a {@link AnalysisResponse.Kind#CLARIFICATION}
 * — a question to the user — rather than guessing or fabricating an estimate.
 *
 * <p>The benefit year is <strong>derived</strong> from the user's enrollment window and the current
 * date ({@link Clock}); it is never hard-coded.
 */
@Service
public class AnalysisService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisService.class);

    private final IntentExtractor intentExtractor;
    private final DentalDataAccess data;
    private final NetworkComparisonService comparisonService;
    private final AiService aiService;
    private final Clock clock;

    public AnalysisService(IntentExtractor intentExtractor,
                           DentalDataAccess data,
                           NetworkComparisonService comparisonService,
                           AiService aiService,
                           Clock clock) {
        this.intentExtractor = intentExtractor;
        this.data = data;
        this.comparisonService = comparisonService;
        this.aiService = aiService;
        this.clock = clock;
    }

    /**
     * Analyze a user's message and return either structured estimate(s) or a clarification question.
     *
     * @param userId  the id of the user asking (plan/usage are loaded for this user, never supplied
     *                by the client)
     * @param message the natural-language question
     * @return an {@link AnalysisResponse} carrying estimates or a clarification
     */
    public AnalysisResponse analyze(String userId, String message) {
        DentalIntent intent = intentExtractor.interpret(message);

        if (intent == null || intent.type() == null || intent.type() == DentalIntentType.UNSUPPORTED) {
            return AnalysisResponse.ofClarification(
                    "I can estimate the cost of a specific procedure, including an in- vs "
                            + "out-of-network comparison. Could you tell me which procedure you mean "
                            + "and what you'd like to know?");
        }

        // 1. We need a procedure reference to act on anything.
        ProcedureReference ref = intent.procedure();
        if (ref == null || isBlank(ref.spokenName())) {
            return AnalysisResponse.ofClarification(
                    "Which procedure are you asking about? For example a crown, filling, or cleaning.");
        }

        // 2. Resolve the spoken term against TRUSTED catalog data (never the AI's guessed code).
        ProcedureResolution resolution = data.resolveProcedure(ref.spokenName());
        switch (resolution.outcome()) {
            case UNKNOWN -> {
                return AnalysisResponse.ofClarification(
                        "I couldn't match \"" + ref.spokenName() + "\" to a dental procedure. "
                                + "Could you describe it the way your dentist did?");
            }
            case AMBIGUOUS -> {
                String names = resolution.candidates().stream()
                        .map(ResolvedProcedure::canonicalName)
                        .reduce((a, b) -> a + ", " + b)
                        .orElse("a few options");
                return AnalysisResponse.ofClarification(
                        "\"" + ref.spokenName() + "\" could mean a few things (" + names
                                + "). Which did you mean?");
            }
            case RESOLVED -> { /* fall through */ }
        }
        ResolvedProcedure procedure = resolution.procedure();

        // 3. The user's active plan is required for pricing; it also defines the benefit year.
        Optional<PlanContext> planOpt = data.findActivePlan(userId);
        if (planOpt.isEmpty()) {
            return AnalysisResponse.ofClarification(
                    "I couldn't find an active dental plan for your account. Have you checked in a "
                            + "plan yet?");
        }
        PlanContext plan = planOpt.get();

        // 4. If the user claims this was recommended, confirm it against trusted appointment data.
        if (intent.claimsRecommendation() && !recommendationConfirmed(userId, procedure.cdtCode())) {
            return AnalysisResponse.ofClarification(
                    "I don't see a recent appointment where a " + procedure.canonicalName()
                            + " was recommended. I can still estimate it if you'd like — just confirm "
                            + "you want a cost estimate for a " + procedure.canonicalName() + ".");
        }

        // 5. Tooth-specific procedures need a tooth number to price honestly.
        Integer tooth = ref.toothNumber();
        if (procedure.isToothSpecific() && tooth == null) {
            return AnalysisResponse.ofClarification(
                    "A " + procedure.canonicalName() + " is billed per tooth. Which tooth is it "
                            + "(for example #19)?");
        }

        // 6. Derive the benefit year from the enrollment window + today — never hard-coded.
        int benefitYear = deriveBenefitYear(plan);

        ProcedureCharge charge = new ProcedureCharge(
                procedure.cdtCode(), procedure.canonicalName(), tooth);

        // The analyzer always answers with an in- vs out-of-network comparison — the app's core
        // feature. (Scope kept tight for the hackathon: no separate single-network path.)
        return buildComparison(userId, plan, procedure, charge, benefitYear);
    }

    private AnalysisResponse buildComparison(String userId,
                                             PlanContext plan,
                                             ResolvedProcedure procedure,
                                             ProcedureCharge charge,
                                             int benefitYear) {
        Optional<ProcedureCoverage> inCov =
                data.findCoverage(plan.planId(), procedure.cdtCode(), NetworkTier.IN_NETWORK);
        Optional<ProcedureCoverage> outCov =
                data.findCoverage(plan.planId(), procedure.cdtCode(), NetworkTier.OUT_OF_NETWORK);
        Optional<BenefitUsage> inUse =
                data.findBenefitUsage(plan.enrollmentId(), benefitYear, NetworkTier.IN_NETWORK);
        Optional<BenefitUsage> outUse =
                data.findBenefitUsage(plan.enrollmentId(), benefitYear, NetworkTier.OUT_OF_NETWORK);

        if (inCov.isEmpty() || outCov.isEmpty() || inUse.isEmpty() || outUse.isEmpty()) {
            return missingPricingData(procedure);
        }

        // Both snapshots reflect the same original benefit state; the comparison keeps them independent.
        NetworkComparison comparison = comparisonService.compare(
                charge, inCov.get(), outCov.get(), inUse.get(), outUse.get(), plan.planRules());

        // Pair each authoritative estimate with a plain-English explanation. The AI only narrates;
        // the numbers are never changed.
        List<BenefitEstimate> explained = comparison.asList().stream()
                .map(this::explain)
                .toList();

        String summary = "Estimated cost of a " + procedure.canonicalName()
                + " in network versus out of network under " + plan.planName() + ".";
        return AnalysisResponse.ofEstimates(explained, summary);
    }

    private AnalysisResponse missingPricingData(ResolvedProcedure procedure) {
        return AnalysisResponse.ofClarification(
                "I don't have enough plan pricing information to estimate a "
                        + procedure.canonicalName() + " yet. This usually means the plan's fee "
                        + "schedule or benefit usage isn't loaded for this procedure.");
    }

    /**
     * Attach a plain-English explanation to an authoritative estimate without ever changing its
     * numbers. The AI is called to narrate only; if it returns {@code null}/blank or throws, the
     * original estimate is returned unchanged so a flaky explainer can never corrupt or block the
     * result.
     */
    private BenefitEstimate explain(BenefitEstimate estimate) {
        try {
            String explanation = aiService.explainEstimate(estimate);
            if (explanation == null || explanation.isBlank()) {
                return estimate;
            }
            return estimate.withExplanation(explanation);
        } catch (RuntimeException e) {
            log.warn("Explanation step failed for {}; returning estimate without narrative",
                    estimate.cdtCode(), e);
            return estimate;
        }
    }

    private boolean recommendationConfirmed(String userId, String cdtCode) {
        List<RecentAppointment> appointments = data.findRecentAppointments(userId);
        return appointments != null && appointments.stream().anyMatch(a -> a.recommends(cdtCode));
    }

    /**
     * Derive the applicable benefit year from the enrollment window and the current date. If today
     * falls inside the enrollment's benefit year, that window's start year is used; otherwise the
     * enrollment window's start year is used. No year is ever hard-coded.
     */
    private int deriveBenefitYear(PlanContext plan) {
        LocalDate today = LocalDate.now(clock);
        if (!today.isBefore(plan.benefitYearStart()) && !today.isAfter(plan.benefitYearEnd())) {
            return plan.benefitYearOf(today);
        }
        return plan.benefitYearStart().getYear();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
