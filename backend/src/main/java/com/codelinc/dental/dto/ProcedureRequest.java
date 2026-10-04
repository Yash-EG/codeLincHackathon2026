package com.codelinc.dental.dto;

/**
 * A single procedure the user referenced, as understood by Bedrock.
 *
 * <p><strong>Boundary rule:</strong> Bedrock normalizes <em>language</em>, not identity.
 * It records what the user said ({@code nameHint}) and a canonical lowercase label
 * ({@code normalizedName}, e.g. {@code "crown"}, {@code "filling"}, {@code "root canal"}),
 * but it does <em>not</em> emit CDT codes. Resolving {@code normalizedName} to a CDT code
 * is done by Jay/Gopal using {@code cdt_procedures.common_aliases} in Neon. This keeps the
 * AI layer decoupled from the procedure catalog.
 *
 * @param nameHint       the user's own words for the procedure (e.g. "a cap on my molar")
 * @param normalizedName canonical lowercase label, or {@code null} if it could not be
 *                       confidently normalized (the hint is still preserved so the caller
 *                       knows a procedure was mentioned but is unresolved)
 * @param quantity       how many, as stated or implied by the user; defaults to 1 when a
 *                       procedure is mentioned without a count
 * @param toothNumber    Universal tooth number (1–32) if the user specified one, otherwise
 *                       {@code null}
 */
public record ProcedureRequest(
        String nameHint,
        String normalizedName,
        int quantity,
        Integer toothNumber
) {
}
