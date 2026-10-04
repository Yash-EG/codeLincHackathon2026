package com.codelinc.dental.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/analyze}.
 *
 * <p>The client supplies only <strong>who</strong> is asking and <strong>what</strong> they asked in
 * plain language. It deliberately carries no plan rules, prices, coverage, or usage: those are
 * trusted facts the backend loads for {@code userId} from the data layer. Accepting them from the
 * client would let the caller fabricate coverage or cost, which the analyzer must never trust.
 *
 * @param userId  the id of the user asking (plan/usage are loaded server-side for this id)
 * @param message the natural-language question, e.g. "how much will a crown cost in vs out of network?"
 */
public record AnalyzeRequest(
        @NotBlank(message = "userId must not be blank")
        @Size(max = 64, message = "userId must be at most 64 characters")
        String userId,

        @NotBlank(message = "message must not be blank")
        @Size(max = 4000, message = "message must be at most 4000 characters")
        String message
) {
}
