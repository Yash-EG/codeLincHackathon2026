package com.codelinc.dental.service.education;

/**
 * Narrow abstraction over the dedicated education model call.
 *
 * <p>Kept separate from the general {@code AiService} so the education capability
 * has its OWN system instructions and its OWN configurable model ID, and so the
 * orchestrating {@link EducationChatService} can be unit-tested with a mock and
 * no AWS. Implementations receive a system prompt (education-only guardrails) and
 * the composed user prompt (approved definitions + any verified facts) and return
 * the model's text.
 */
public interface EducationModelClient {

    /**
     * @return true if a real model is configured and should be used; false means
     *         the service should use its deterministic plain-language fallback.
     */
    boolean isAvailable();

    /**
     * Send the education system prompt and user prompt to the model.
     *
     * @param systemPrompt education-only instructions and guardrails
     * @param userPrompt   the question plus approved definitions and verified facts
     * @return the model's text output
     * @throws com.codelinc.dental.exception.AiServiceException if the call fails
     */
    String rewrite(String systemPrompt, String userPrompt);
}
