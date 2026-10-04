package com.codelinc.dental.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for the intent-extraction dev endpoint {@code POST /api/ai/intent}.
 *
 * @param message the user's natural-language message to classify
 */
public record IntentRequest(
        @NotBlank(message = "message must not be blank")
        @Size(max = 4000, message = "message must be at most 4000 characters")
        String message
) {
}
