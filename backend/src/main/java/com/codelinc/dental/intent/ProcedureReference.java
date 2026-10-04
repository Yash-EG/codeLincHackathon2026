package com.codelinc.dental.intent;

/**
 * A procedure the user referred to, as extracted from their message by the AI.
 *
 * <p>Part of the backend-owned AI-intent boundary. This is an <strong>unverified reference</strong>:
 * it captures what the user/AI said (a spoken name or alias such as "crown"/"cap", an optional tooth
 * number), <em>not</em> a trusted procedure. The orchestrator must resolve the {@link #spokenName()}
 * against trusted procedure data to obtain the real CDT code, coverage class and fees. The AI's text
 * is never treated as proof of the procedure, its price, or its coverage.
 *
 * <p>{@code cdtCodeHint} may carry a CDT code the AI guessed; it is only a hint and must still be
 * validated against trusted data before use.
 *
 * <p><strong>Contract note for the AI owner:</strong> if your {@code ProcedureReference} differs
 * (field names/types), we converge on one definition. This is the port the backend resolves against
 * today.
 *
 * @param spokenName  the everyday term the user used (e.g. {@code "crown"}); may be {@code null}
 * @param cdtCodeHint an optional CDT code the AI guessed; a hint only, never trusted as-is
 * @param toothNumber Universal tooth number 1–32 if the user named one, else {@code null}
 */
public record ProcedureReference(
        String spokenName,
        String cdtCodeHint,
        Integer toothNumber
) {
}
