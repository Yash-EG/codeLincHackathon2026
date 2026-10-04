package com.codelinc.dental.dto;

/**
 * A patient-friendly procedure explanation produced by the AI layer.
 *
 * @param explanation           the plain-language explanation
 * @param groundedOnTrustedInfo true when the explanation was derived from a trusted
 *                              database description; false means no trusted info was
 *                              available and the service declined to invent clinical
 *                              facts (the explanation then only suggests next steps)
 */
public record ProcedureExplanationResponse(
        String explanation,
        boolean groundedOnTrustedInfo
) {
}
