package com.codelinc.dental.intent;

/**
 * Backend-owned port that turns a user's natural-language message into a structured
 * {@link DentalIntent}.
 *
 * <p>The orchestrator ({@code AnalysisService}) depends on this interface, not on any AI SDK. The AI
 * teammate provides the real implementation (Bedrock prompt + parsing); tests provide a fake. This
 * is intentionally separate from {@code AiService#generateText} and {@code explainEstimate} so the
 * orchestration layer never reaches into prompt details.
 *
 * <p><strong>Trust boundary:</strong> the returned intent is a <em>claim</em> about what the user
 * meant. The backend verifies every actionable part of it (procedure identity, recommendation,
 * prices, coverage) against trusted data before acting. A failure to interpret should return an
 * {@link DentalIntentType#UNSUPPORTED} intent (or throw), never a fabricated estimate.
 */
public interface IntentExtractor {

    /**
     * Interpret a user message into a structured intent.
     *
     * @param message the user's natural-language question
     * @return the AI's structured interpretation (never {@code null})
     */
    DentalIntent interpret(String message);
}
