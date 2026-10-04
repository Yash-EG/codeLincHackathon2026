package com.codelinc.dental.service;

import com.codelinc.dental.dto.DentalIntent;

/**
 * Turns a user's natural-language message into a structured {@link DentalIntent}.
 *
 * <p>This is the AI layer's primary hand-off to the orchestration/calculation layer.
 * Implementations must never throw on bad model output: an unparseable or low-confidence
 * result is returned as a safe {@code UNKNOWN} intent with {@code needsClarification}
 * set, so the caller can ask the user a follow-up instead of failing.
 */
public interface IntentExtractionService {

    /**
     * Extract structured intent from a raw user message.
     *
     * @param userMessage the end user's natural-language message
     * @return a populated {@link DentalIntent}; never {@code null}
     */
    DentalIntent extractIntent(String userMessage);
}
