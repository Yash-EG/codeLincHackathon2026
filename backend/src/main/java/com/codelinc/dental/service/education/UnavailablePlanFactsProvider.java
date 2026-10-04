package com.codelinc.dental.service.education;

import java.util.Optional;

/**
 * Default {@link PlanFactsProvider} used until Jay's verified, authenticated
 * provider is wired in. It always returns {@link Optional#empty()}, so the
 * chatbot never invents a user's plan amounts: personal-plan questions get a
 * transparent "we can't verify your specific amounts yet" response while the
 * general explanation still works.
 *
 * <p>Registered as a {@code @ConditionalOnMissingBean} fallback in
 * {@link EducationConfig}, so when Jay registers a real {@code PlanFactsProvider}
 * bean it replaces this one with no change to the chatbot code.
 */
public class UnavailablePlanFactsProvider implements PlanFactsProvider {

    @Override
    public Optional<PlanFacts> currentPlanFacts() {
        return Optional.empty();
    }
}
