package com.codelinc.dental.service;

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
}
