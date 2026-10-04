package com.codelinc.dental.service;

import com.codelinc.dental.dto.AnalysisResponse;
import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.dto.PendingProcedure;
import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.DentalIntentType;
import com.codelinc.dental.intent.IntentExtractor;
import com.codelinc.dental.intent.ProcedureReference;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import com.codelinc.dental.service.data.ResolvedProcedure;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Orchestration tests for {@link AnalysisService} using a fake {@link IntentExtractor} (the AI
 * boundary) and a fake {@link DentalDataAccess} (the data boundary). No Spring context, no AI, no DB.
 *
 * <p>The headline test is the exact question from the task:
 * "How much will the crown my dentist recommended cost in network versus out of network?"
 */
class AnalysisServiceTest {

    private static final String USER = "user-1";
    private static final String CROWN_CDT = "D2740";

    // Benefit year window 2026; the fixed clock sits inside it so the derived year is 2026 — never
    // hard-coded in the service, derived from the enrollment window below.
    private static final LocalDate YEAR_START = LocalDate.of(2026, 1, 1);
    private static final LocalDate YEAR_END = LocalDate.of(2026, 12, 31);
    private final Clock fixedClock =
            Clock.fixed(LocalDate.of(2026, 6, 15).atStartOfDay(ZoneId.of("UTC")).toInstant(), ZoneId.of("UTC"));

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    // ---- Fakes ---------------------------------------------------------------------------------

    /** Returns a fixed, pre-built intent regardless of the message text. */
    private static IntentExtractor fakeIntent(DentalIntent intent) {
        return message -> intent;
    }

    /** Mutable in-memory data-access fake with sensible crown defaults. */
    private static final class FakeData implements DentalDataAccess {
        PlanContext plan = new PlanContext(
                "enr-1", "plan-1", "Premier PPO", YEAR_START, YEAR_END, new PlanRules(usd("0.80")));
        ProcedureResolution resolution =
                ProcedureResolution.resolved(new ResolvedProcedure(CROWN_CDT, "Crown", true));
        final List<RecentAppointment> appointments = new ArrayList<>();
        ProcedureCoverage inCoverage =
                new ProcedureCoverage(CROWN_CDT, NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        ProcedureCoverage outCoverage =
                new ProcedureCoverage(CROWN_CDT, NetworkTier.OUT_OF_NETWORK, true, usd("50"), true, usd("1400.00"));
        BenefitUsage inUsage =
                new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));
        BenefitUsage outUsage =
                new BenefitUsage(NetworkTier.OUT_OF_NETWORK, usd("0.00"), usd("2000.00"));
        Integer requireYear = null; // if set, findBenefitUsage asserts the year it was asked for

        @Override public Optional<PlanContext> findActivePlan(String userId) {
            return Optional.ofNullable(plan);
        }

        @Override public ProcedureResolution resolveProcedure(String spokenName) {
            return resolution;
        }

        @Override public Optional<ProcedureCoverage> findCoverage(String planId, String cdtCode, NetworkTier tier) {
            if (inCoverage == null || outCoverage == null) return Optional.empty();
            return Optional.of(tier == NetworkTier.IN_NETWORK ? inCoverage : outCoverage);
        }

        @Override public Optional<BenefitUsage> findBenefitUsage(String enrollmentId, int benefitYear, NetworkTier tier) {
            if (requireYear != null && benefitYear != requireYear) {
                throw new AssertionError("expected benefit year " + requireYear + " but was " + benefitYear);
            }
            if (inUsage == null || outUsage == null) return Optional.empty();
            return Optional.of(tier == NetworkTier.IN_NETWORK ? inUsage : outUsage);
        }

        @Override public List<RecentAppointment> findRecentAppointments(String userId) {
            return appointments;
        }
    }

    private AnalysisService service(IntentExtractor intent, DentalDataAccess data) {
        return service(intent, data, estimate -> null); // no explanation by default
    }

    private AnalysisService service(IntentExtractor intent, DentalDataAccess data, AiService ai) {
        BenefitCalculatorService calc = new BenefitCalculatorService();
        return new AnalysisService(intent, data, new NetworkComparisonService(calc),
                new TreatmentTimingService(), ai, fixedClock);
    }

    private static DentalIntent crownComparisonRecommended() {
        return new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", "D2740", 19),
                DentalIntent.RECOMMENDED);
    }

    // ---- The exact headline question -----------------------------------------------------------

    @Test
    void crownRecommendedInVersusOutOfNetworkProducesTwoLabeledEstimates() {
        FakeData data = new FakeData();
        data.appointments.add(new RecentAppointment(
                "appt-1", LocalDate.of(2026, 5, 1), CROWN_CDT, 19)); // dentist DID recommend the crown
        data.requireYear = 2026; // prove the derived (not hard-coded) year is used for usage lookups

        AnalysisService service = service(fakeIntent(crownComparisonRecommended()), data);

        AnalysisResponse response = service.analyze(
                USER, "How much will the crown my dentist recommended cost in network versus out of network?");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(response.estimates()).hasSize(2);

        BenefitEstimate in = response.estimates().get(0);
        BenefitEstimate out = response.estimates().get(1);
        assertThat(in.networkTier()).isEqualTo(NetworkTier.IN_NETWORK);
        assertThat(out.networkTier()).isEqualTo(NetworkTier.OUT_OF_NETWORK);

        // In-network: $1400 crown, 50%, $600 left -> capped $600 insurance / $800 patient.
        assertThat(in.cdtCode()).isEqualTo(CROWN_CDT);
        assertThat(in.planPays()).isEqualByComparingTo("600.00");
        assertThat(in.patientPays()).isEqualByComparingTo("800.00");
        assertThat(in.overMaximum()).isEqualByComparingTo("100.00");

        // Out-of-network: allowed 1120 (80%), 50% -> plan 560, patient 840 (independent $2000 max).
        assertThat(out.allowed()).isEqualByComparingTo("1120.00");
        assertThat(out.planPays()).isEqualByComparingTo("560.00");
        assertThat(out.patientPays()).isEqualByComparingTo("840.00");

        assertThat(response.summary()).contains("Crown").contains("in network versus out of network");
    }

    // ---- Missing recommendation ----------------------------------------------------------------

    @Test
    void claimedRecommendationWithNoMatchingAppointmentAsksForClarificationWithoutCalculating() {
        FakeData data = new FakeData(); // no appointments recommended the crown
        AnalysisService service = service(fakeIntent(crownComparisonRecommended()), data);

        AnalysisResponse response = service.analyze(USER, "the crown my dentist recommended, in vs out");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.estimates()).isEmpty();
        assertThat(response.clarificationQuestion()).contains("recommended");
    }

    @Test
    void recommendationForADifferentProcedureDoesNotCount() {
        FakeData data = new FakeData();
        data.appointments.add(new RecentAppointment(
                "appt-x", LocalDate.of(2026, 5, 1), "D1110", null)); // recommended a cleaning, not a crown
        AnalysisService service = service(fakeIntent(crownComparisonRecommended()), data);

        AnalysisResponse response = service.analyze(USER, "crown recommended in vs out");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
    }

    // ---- Unknown / ambiguous procedure ---------------------------------------------------------

    @Test
    void unknownProcedureAsksForClarification() {
        FakeData data = new FakeData();
        data.resolution = ProcedureResolution.unknown();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("flux capacitor", null, null),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "cost of a flux capacitor");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("flux capacitor");
    }

    @Test
    void ambiguousProcedureListsCandidates() {
        FakeData data = new FakeData();
        data.resolution = ProcedureResolution.ambiguous(List.of(
                new ResolvedProcedure("D2740", "Crown (porcelain)", true),
                new ResolvedProcedure("D2790", "Crown (full cast)", true)));
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("Crown (porcelain)").contains("Crown (full cast)");
    }

    // ---- Unsupported intent --------------------------------------------------------------------

    @Test
    void unsupportedIntentAsksForClarification() {
        DentalIntent intent = new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
        AnalysisResponse response = service(fakeIntent(intent), new FakeData())
                .analyze(USER, "what's the weather like");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.estimates()).isEmpty();
    }

    @Test
    void nullIntentIsHandledAsClarification() {
        AnalysisResponse response = service(fakeIntent(null), new FakeData()).analyze(USER, "???");
        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
    }

    // ---- Multi-turn clarification context (pending) --------------------------------------------

    @Test
    void toothClarificationCarriesPendingProcedureForTheNextTurn() {
        FakeData data = new FakeData(); // resolves "crown" -> D2740, tooth-specific
        // First turn: user names a crown but no tooth.
        DentalIntent crownNoTooth = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", "D2740", null),
                null);

        AnalysisResponse first = service(fakeIntent(crownNoTooth), data)
                .analyze(USER, "how much is a crown in vs out of network?");

        assertThat(first.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(first.clarificationQuestion()).contains("per tooth");
        // The resolved procedure is carried back so the client can echo it.
        assertThat(first.pending()).isNotNull();
        assertThat(first.pending().cdtCode()).isEqualTo(CROWN_CDT);
        assertThat(first.pending().procedureName()).isEqualTo("Crown");
    }

    @Test
    void bareToothNumberWithPendingResolvesWithoutRestatingTheProcedure() {
        FakeData data = new FakeData();
        data.appointments.add(new RecentAppointment(
                "appt-1", LocalDate.of(2026, 5, 1), CROWN_CDT, 19));

        // Second turn: the message is just "19" and names no procedure (UNSUPPORTED intent),
        // but the client echoes back the pending crown from the previous clarification.
        DentalIntent bareNumber = new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
        PendingProcedure pending = new PendingProcedure(CROWN_CDT, "Crown");

        AnalysisResponse response = service(fakeIntent(bareNumber), data)
                .analyze(USER, "19", pending);

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(response.estimates()).hasSize(2);
        assertThat(response.estimates().get(0).cdtCode()).isEqualTo(CROWN_CDT);
        assertThat(response.estimates().get(0).toothNumber()).isEqualTo(19);
    }

    @Test
    void pendingWithEchoedCdtCodeThatDoesNotMatchTheCatalogIsRejected() {
        FakeData data = new FakeData(); // resolveProcedure(..) -> D2740 Crown
        DentalIntent bareNumber = new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
        // Client echoes a CDT code that does NOT match what the catalog resolves the name to.
        PendingProcedure tampered = new PendingProcedure("D9999", "Crown");

        AnalysisResponse response = service(fakeIntent(bareNumber), data)
                .analyze(USER, "19", tampered);

        // Trust guard: mismatched echo is not priced; we ask which procedure instead.
        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.estimates()).isEmpty();
    }

    @Test
    void parseToothNumberExtractsFromVariousPhrasings() {
        assertThat(AnalysisService.parseToothNumber("19")).isEqualTo(19);
        assertThat(AnalysisService.parseToothNumber("#19")).isEqualTo(19);
        assertThat(AnalysisService.parseToothNumber("tooth 3")).isEqualTo(3);
        assertThat(AnalysisService.parseToothNumber("it's number 32")).isEqualTo(32);
        assertThat(AnalysisService.parseToothNumber("no number here")).isNull();
        assertThat(AnalysisService.parseToothNumber("tooth 33")).isNull(); // out of 1..32 range
    }

    // ---- Missing precondition data -------------------------------------------------------------

    @Test
    void noActivePlanAsksForClarification() {
        FakeData data = new FakeData();
        data.plan = null;
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("active dental plan");
    }

    @Test
    void toothSpecificProcedureWithoutAToothAsksForClarification() {
        FakeData data = new FakeData();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, null), // no tooth
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("per tooth");
    }

    @Test
    void missingCoverageDataAsksForClarificationInsteadOfGuessing() {
        FakeData data = new FakeData();
        data.inCoverage = null; // fee schedule not loaded
        data.outCoverage = null;
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("pricing information");
    }

    // ---- Single-network path -------------------------------------------------------------------

    @Test
    void aPlainCostQuestionIsAnsweredAsAComparison() {
        FakeData data = new FakeData();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        // Scope decision: a supported cost question always returns an in- vs out-of-network comparison.
        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(response.estimates()).hasSize(2);
        assertThat(response.estimates().get(0).networkTier()).isEqualTo(NetworkTier.IN_NETWORK);
        assertThat(response.estimates().get(1).networkTier()).isEqualTo(NetworkTier.OUT_OF_NETWORK);
    }

    // ---- Benefit year is derived, not hard-coded -----------------------------------------------

    @Test
    void benefitYearIsDerivedFromTheEnrollmentWindowNotHardCoded() {
        // Enrollment window in 2024 with a clock in 2024 -> service must look up usage for 2024.
        FakeData data = new FakeData();
        data.plan = new PlanContext("enr-1", "plan-1", "Premier PPO",
                LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31), new PlanRules(usd("0.80")));
        data.requireYear = 2024; // findBenefitUsage will throw if the service passes any other year
        Clock clock2024 = Clock.fixed(
                LocalDate.of(2024, 3, 10).atStartOfDay(ZoneId.of("UTC")).toInstant(), ZoneId.of("UTC"));
        BenefitCalculatorService calc = new BenefitCalculatorService();
        AnalysisService service = new AnalysisService(
                fakeIntent(new DentalIntent(DentalIntentType.COST_ESTIMATE,
                        new ProcedureReference("crown", null, 19), null)),
                data, new NetworkComparisonService(calc), new TreatmentTimingService(),
                estimate -> null, clock2024);

        AnalysisResponse response = service.analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE); // no AssertionError => year 2024 used
    }

    // ---- Trust boundary: AI's guessed code is not used to price --------------------------------

    @Test
    void pricingUsesTheTrustedResolvedCodeNotTheAiGuessedHint() {
        FakeData data = new FakeData();
        // Trusted resolution says D2740; the AI hint lies with a different code.
        data.resolution = ProcedureResolution.resolved(new ResolvedProcedure(CROWN_CDT, "Crown", true));
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", "D9999-BOGUS", 19), // bogus hint
                null);

        AnalysisResponse response = service(fakeIntent(intent), data).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(response.estimates().get(0).cdtCode()).isEqualTo(CROWN_CDT); // trusted code, not the hint
    }

    // ---- Phase 5: explanations -----------------------------------------------------------------

    /** Fake AiService that returns a canned explanation per estimate and records every call. */
    private static final class RecordingAi implements AiService {
        final List<BenefitEstimate> explained = new ArrayList<>();

        @Override public String generateText(String prompt) {
            throw new UnsupportedOperationException("not used in analysis");
        }

        @Override public String explainEstimate(BenefitEstimate estimate) {
            explained.add(estimate);
            return "Your plan pays " + estimate.planPays() + " " + estimate.networkTier()
                    + "; you pay " + estimate.patientPays() + ".";
        }
    }

    @Test
    void everyEstimateInAComparisonGetsAnExplanationWithoutChangingTheNumbers() {
        FakeData data = new FakeData();
        data.appointments.add(new RecentAppointment("appt-1", LocalDate.of(2026, 5, 1), CROWN_CDT, 19));
        RecordingAi ai = new RecordingAi();

        AnalysisResponse response = service(fakeIntent(crownComparisonRecommended()), data, ai)
                .analyze(USER, "the crown my dentist recommended, in vs out");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(response.estimates()).hasSize(2);

        BenefitEstimate in = response.estimates().get(0);
        BenefitEstimate out = response.estimates().get(1);

        // Both estimates carry an explanation.
        assertThat(in.explanation()).isNotNull().contains("IN_NETWORK");
        assertThat(out.explanation()).isNotNull().contains("OUT_OF_NETWORK");

        // The AI was called exactly once per estimate.
        assertThat(ai.explained).hasSize(2);

        // The authoritative numbers are unchanged by the explanation step.
        assertThat(in.planPays()).isEqualByComparingTo("600.00");
        assertThat(in.patientPays()).isEqualByComparingTo("800.00");
        assertThat(in.overMaximum()).isEqualByComparingTo("100.00");
        assertThat(out.planPays()).isEqualByComparingTo("560.00");
        assertThat(out.patientPays()).isEqualByComparingTo("840.00");
    }

    @Test
    void everyEstimateGetsAnExplanation() {
        FakeData data = new FakeData();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);

        AnalysisResponse response = service(fakeIntent(intent), data, new RecordingAi())
                .analyze(USER, "crown cost");

        assertThat(response.estimates()).hasSize(2);
        assertThat(response.estimates().get(0).explanation()).isNotNull().contains("IN_NETWORK");
        assertThat(response.estimates().get(1).explanation()).isNotNull().contains("OUT_OF_NETWORK");
    }

    @Test
    void aiReturningNullLeavesEstimateIntactWithNoExplanation() {
        FakeData data = new FakeData();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);
        AiService nullExplainer = new AiService() {
            @Override public String generateText(String prompt) { return null; }
            @Override public String explainEstimate(BenefitEstimate estimate) { return null; }
        };

        AnalysisResponse response = service(fakeIntent(intent), data, nullExplainer)
                .analyze(USER, "crown cost");

        BenefitEstimate e = response.estimates().get(0);
        assertThat(e.explanation()).isNull();
        assertThat(e.planPays()).isEqualByComparingTo("600.00"); // numbers intact
        assertThat(e.patientPays()).isEqualByComparingTo("800.00");
    }

    @Test
    void aiThrowingDoesNotCorruptOrBlockTheAuthoritativeEstimate() {
        FakeData data = new FakeData();
        DentalIntent intent = new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", null, 19),
                null);
        AiService flaky = new AiService() {
            @Override public String generateText(String prompt) { return null; }
            @Override public String explainEstimate(BenefitEstimate estimate) {
                throw new RuntimeException("model timed out");
            }
        };

        AnalysisResponse response = service(fakeIntent(intent), data, flaky).analyze(USER, "crown cost");

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        BenefitEstimate e = response.estimates().get(0);
        assertThat(e.explanation()).isNull();          // no narrative
        assertThat(e.planPays()).isEqualByComparingTo("600.00"); // but numbers survive intact
        assertThat(e.patientPays()).isEqualByComparingTo("800.00");
    }

    // ---- Context preamble and resuming ------------------------------------------------------------

    @Test
    void toothIsReadFromTheCurrentQuestionNotFromEarlierPrices() {
        FakeData data = new FakeData();
        DentalIntent crownNoTooth = new DentalIntent(DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("crown", "D2740", null), null);
        // The frontend sends the conversation so far, then the question. "$1,110.00" must not become tooth #1.
        String message = "Conversation so far:\nAssistant: You would pay $1,110.00.\n\nCurrent question: what about a crown?";

        AnalysisResponse response = service(fakeIntent(crownNoTooth), data).analyze(USER, message);

        assertThat(response.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(response.clarificationQuestion()).contains("Which tooth");
    }

    @Test
    void unconfirmedRecommendationCarriesTheProcedureAndToothSoYesContinues() {
        FakeData data = new FakeData(); // no appointment recommended the crown
        AnalysisService service = service(fakeIntent(crownComparisonRecommended()), data);

        AnalysisResponse first = service.analyze(USER, "the crown my dentist recommended on 19");
        assertThat(first.kind()).isEqualTo(AnalysisResponse.Kind.CLARIFICATION);
        assertThat(first.pending()).isEqualTo(new PendingProcedure(CROWN_CDT, "Crown", 19));

        // "yes" names nothing, but the echoed pending crown (with its tooth) is priced.
        DentalIntent yes = new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
        AnalysisResponse second = service(fakeIntent(yes), data).analyze(USER, "yes", first.pending());
        assertThat(second.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
        assertThat(second.estimates().get(0).toothNumber()).isEqualTo(19);
    }

    @Test
    void confirmingIsNotBlockedWhenTheAiReadsTheRecommendationAgain() {
        FakeData data = new FakeData(); // still no appointment on file
        // The AI re-reads the conversation and reports the recommendation claim again on the "yes" turn.
        AnalysisResponse second = service(fakeIntent(crownComparisonRecommended()), data)
                .analyze(USER, "yes", new PendingProcedure(CROWN_CDT, "Crown", 19));

        assertThat(second.kind()).isEqualTo(AnalysisResponse.Kind.ESTIMATE);
    }
}
