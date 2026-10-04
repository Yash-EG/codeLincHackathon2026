package com.codelinc.dental.dto.education;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/education/chat}.
 *
 * <p>Only the employee's free-text question is accepted. The chatbot NEVER
 * accepts a plan ID or account facts from the client as trusted context; any
 * personal-plan data comes solely from the server-side authenticated
 * {@link com.codelinc.dental.service.education.PlanFactsProvider}.
 *
 * @param message the employee's question
 */
public record EducationChatRequest(
        @NotBlank(message = "message must not be blank")
        @Size(max = 2000, message = "message must be at most 2000 characters")
        String message
) {
}
