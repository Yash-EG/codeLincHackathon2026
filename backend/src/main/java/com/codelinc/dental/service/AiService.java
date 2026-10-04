package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;

/**
 * Abstraction over the AI provider.
 *
 * <p>Controllers and future business services depend on this interface, not on the
 * AWS SDK directly, so the Bedrock implementation can evolve (or be swapped/mocked)
 * without touching callers.
 */
public interface AiService {

    /**
     * Send a single prompt to the model and return its text response.
     *
     * @param prompt the user prompt
     * @return the model's text output
     * @throws com.codelinc.dental.exception.AiServiceException if the model call fails
     */
    String generateText(String prompt);

    /**
     * Produce a plain-English explanation of an already-calculated {@link BenefitEstimate}.
     *
     * <p><strong>Explain only — never calculate.</strong> The numbers on {@code estimate} are
     * authoritative and are computed by {@code BenefitCalculatorService}. This method turns those
     * numbers into a human-readable narrative (why the plan pays what it pays, what the deductible and
     * annual maximum did); it must not change, re-derive, or contradict any amount. The caller keeps
     * the original estimate and only attaches the returned text via
     * {@link BenefitEstimate#withExplanation(String)}.
     *
     * <p>The default implementation returns {@code null} (no explanation available) so the foundation
     * and tests compile before the Bedrock-backed implementation exists. The AI teammate overrides
     * this. Callers must tolerate a {@code null} result.
     *
     * @param estimate the completed, authoritative estimate to explain
     * @return a plain-English explanation, or {@code null} if none can be produced
     */
    default String explainEstimate(BenefitEstimate estimate) {
        return null;
    }
}
