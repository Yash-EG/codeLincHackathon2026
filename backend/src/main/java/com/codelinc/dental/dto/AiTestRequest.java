package com.codelinc.dental.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/ai/test}.
 *
 * @param message the prompt to send to the model
 */
public record AiTestRequest(
        @NotBlank(message = "message must not be blank")
        @Size(max = 4000, message = "message must be at most 4000 characters")
        String message
) {
}
