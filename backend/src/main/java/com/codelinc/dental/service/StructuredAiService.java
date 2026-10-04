package com.codelinc.dental.service;

/**
 * A system-prompted structured text call, kept separate from {@link AiService} so that
 * {@code AiService} remains a single-abstract-method (functional) interface.
 *
 * <p>Used by intent extraction, which needs a dedicated system instruction (e.g. "reply
 * with strict JSON only"). Implemented by {@link BedrockAiService}; mocked in tests.
 */
public interface StructuredAiService {

    /**
     * Send a system instruction plus a user prompt and return the model's text response.
     *
     * @param systemPrompt the system instruction
     * @param userPrompt   the user prompt
     * @return the model's text output
     * @throws com.codelinc.dental.exception.AiServiceException if the model call fails
     */
    String generateText(String systemPrompt, String userPrompt);
}
