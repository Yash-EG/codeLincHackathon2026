package com.codelinc.dental.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request to turn trusted procedure information into a patient-friendly explanation.
 *
 * <p><strong>Grounding boundary:</strong> the trusted facts come from Neon
 * ({@code cdt_procedures.short_name} and {@code plain_description}), fetched by
 * Jay/Gopal and passed in here. The AI layer never queries the database and never
 * invents clinical facts — it only simplifies the supplied {@code plainDescription}.
 *
 * @param shortName        the procedure's short name (e.g. "Crown"); may be blank
 * @param plainDescription the trusted plain-language description from Neon. If blank,
 *                         the service refuses to invent an explanation.
 * @param userQuestion     optional specific question the user asked (e.g. "does it
 *                         hurt?"); may be null/blank
 */
public record ProcedureExplanationRequest(
        @Size(max = 200, message = "shortName must be at most 200 characters")
        String shortName,

        @NotBlank(message = "plainDescription must not be blank")
        @Size(max = 4000, message = "plainDescription must be at most 4000 characters")
        String plainDescription,

        @Size(max = 1000, message = "userQuestion must be at most 1000 characters")
        String userQuestion
) {
}
