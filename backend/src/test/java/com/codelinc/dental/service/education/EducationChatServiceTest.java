package com.codelinc.dental.service.education;

import com.codelinc.dental.dto.education.EducationChatResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link EducationChatService} using a real {@link Glossary} and
 * {@link EducationIntentRouter}, a fake {@link PlanFactsProvider}, and a stub
 * {@link EducationModelClient}. No Spring context, no AWS, no database.
 */
class EducationChatServiceTest {

    private final Glossary glossary = new Glossary();
    private final EducationIntentRouter router = new EducationIntentRouter(glossary);

    /** Model that is "not configured", forcing the deterministic fallback. */
    private static final EducationModelClient MODEL_OFF = new EducationModelClient() {
        @Override
        public boolean isAvailable() {
            return false;
        }

        @Override
        public String rewrite(String systemPrompt, String userPrompt) {
            throw new AssertionError("model should not be called when unavailable");
        }
    };

    /** Provider that never has verified facts (the default until Jay's wiring). */
    private static final PlanFactsProvider NO_FACTS = Optional::empty;

    private EducationChatService service(PlanFactsProvider facts, EducationModelClient model) {
        return new EducationChatService(router, glossary, facts, model);
    }

    // --- SAMPLE DATA, test-only ------------------------------------------------
    // Explicitly labeled sample facts. Not real member data; used only to exercise
    // the personal-plan path. The real values come from Jay's PlanFactsProvider.
    private static PlanFacts sampleCoinsuranceFacts() {
        return new PlanFacts(
                "Sample PPO",
                new BigDecimal("2000"),
                new BigDecimal("1200"),
                new BigDecimal("50"),
                BigDecimal.ZERO,
                80,   // in-network: plan pays 80%
                50,   // out-of-network: plan pays 50%
                null, // no fixed copay (uses coinsurance)
                null);
    }

    @Test
    void whatIsADeductible_generalDefinition_worksWithoutAccountData() {
        EducationChatResponse r = service(NO_FACTS, MODEL_OFF).answer("What is a deductible?");

        assertThat(r.intent()).isEqualTo(EducationIntent.GENERAL_DEFINITION);
        assertThat(r.termsUsed()).contains("deductible");
        assertThat(r.personalPlanDataAvailable()).isNull();
        assertThat(r.estimateHandoff()).isFalse();
        assertThat(r.modelUsed()).isFalse();
        assertThat(r.answer()).contains("before your plan starts paying");
    }

    @Test
    void copayVsCoinsurance_generalDefinition_explainsBoth() {
        EducationChatResponse r = service(NO_FACTS, MODEL_OFF)
                .answer("What is the difference between a copay and coinsurance?");

        assertThat(r.intent()).isEqualTo(EducationIntent.GENERAL_DEFINITION);
        assertThat(r.termsUsed()).contains("copay", "coinsurance");
        // Copay is a fixed dollar amount; coinsurance is a percentage.
        assertThat(r.answer()).contains("fixed dollar amount");
        assertThat(r.answer()).contains("percentage");
    }

    @Test
    void personalNetworkQuestion_withVerifiedFacts_statesEachNetwork() {
        EducationChatResponse r = service(() -> Optional.of(sampleCoinsuranceFacts()), MODEL_OFF)
                .answer("How does my copay differ in network versus out of network?");

        assertThat(r.intent()).isEqualTo(EducationIntent.PERSONAL_PLAN_QUESTION);
        assertThat(r.personalPlanDataAvailable()).isTrue();
        assertThat(r.estimateHandoff()).isFalse();
        // Gentle correction: they said "copay" but plan uses coinsurance.
        assertThat(r.answer()).containsIgnoringCase("coinsurance");
        // In-network 80/20, out-of-network 50/50 stated in plain language.
        assertThat(r.answer()).contains("in network, the plan pays 80% and you pay 20%");
        assertThat(r.answer()).contains("out of network, the plan pays 50% and you pay 50%");
    }

    @Test
    void personalNetworkQuestion_withoutFacts_isTransparentAndStillExplainsGeneral() {
        EducationChatResponse r = service(NO_FACTS, MODEL_OFF)
                .answer("How does my copay differ in network versus out of network?");

        assertThat(r.intent()).isEqualTo(EducationIntent.PERSONAL_PLAN_QUESTION);
        assertThat(r.personalPlanDataAvailable()).isFalse();
        assertThat(r.answer()).containsIgnoringCase("can't verify your specific plan amounts");
        // Still teaches the general concept.
        assertThat(r.answer().toLowerCase()).containsAnyOf("in network", "in-network", "coinsurance", "copay");
        // Must not invent any dollar amount.
        assertThat(r.answer()).doesNotContain("$");
    }

    @Test
    void crownCostQuestion_isEstimateHandoff_withNoPrice() {
        EducationChatResponse r = service(() -> Optional.of(sampleCoinsuranceFacts()), MODEL_OFF)
                .answer("How much will a crown cost me?");

        assertThat(r.intent()).isEqualTo(EducationIntent.ESTIMATE_REQUEST);
        assertThat(r.estimateHandoff()).isTrue();
        assertThat(r.personalPlanDataAvailable()).isNull();
        // No fabricated price.
        assertThat(r.answer()).doesNotContain("$");
        assertThat(r.answer()).containsIgnoringCase("cost-estimate");
    }

    @Test
    void modelIntroducingUnsupportedAmount_isRejected_fallsBackToDeterministic() {
        // Model is "available" but returns an answer with a dollar amount NOT in the
        // verified facts. The service must reject it and use the deterministic answer.
        EducationModelClient rogue = new EducationModelClient() {
            @Override
            public boolean isAvailable() {
                return true;
            }

            @Override
            public String rewrite(String systemPrompt, String userPrompt) {
                return "Your plan pays 80% in network, so a crown will cost you exactly $37.50.";
            }
        };

        EducationChatResponse r = service(() -> Optional.of(sampleCoinsuranceFacts()), rogue)
                .answer("How does my coinsurance work in network versus out of network?");

        assertThat(r.modelUsed()).isFalse();
        assertThat(r.answer()).doesNotContain("$37.50");
        // Deterministic answer still present.
        assertThat(r.answer()).contains("in network, the plan pays 80% and you pay 20%");
    }

    @Test
    void modelKeepingOnlyVerifiedAmounts_isAccepted() {
        // A rewrite that only uses verified amounts ($1200 remaining max) is allowed.
        EducationModelClient good = new EducationModelClient() {
            @Override
            public boolean isAvailable() {
                return true;
            }

            @Override
            public String rewrite(String systemPrompt, String userPrompt) {
                return "In general, your annual maximum is the most your plan pays per year. "
                        + "Your plan: your remaining annual maximum is $1200.";
            }
        };

        EducationChatResponse r = service(() -> Optional.of(sampleCoinsuranceFacts()), good)
                .answer("What is my remaining annual maximum?");

        assertThat(r.intent()).isEqualTo(EducationIntent.PERSONAL_PLAN_QUESTION);
        assertThat(r.personalPlanDataAvailable()).isTrue();
        assertThat(r.modelUsed()).isTrue();
        assertThat(r.answer()).contains("$1200");
    }

    @Test
    void unsupportedAmountGuard_detectsForeignAmounts() {
        assertThat(EducationChatService.introducesUnsupportedAmount(
                "it costs $500", java.util.List.of("$1200"))).isTrue();
        assertThat(EducationChatService.introducesUnsupportedAmount(
                "remaining is $1200", java.util.List.of("$1200"))).isFalse();
        assertThat(EducationChatService.introducesUnsupportedAmount(
                "no amounts here", java.util.List.of())).isFalse();
    }

    @Test
    void outOfScopeQuestion_isClassifiedOutOfScope() {
        EducationChatResponse r = service(NO_FACTS, MODEL_OFF).answer("What is the capital of France?");

        assertThat(r.intent()).isEqualTo(EducationIntent.OUT_OF_SCOPE);
        assertThat(r.estimateHandoff()).isFalse();
    }
}
