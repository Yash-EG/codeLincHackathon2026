package com.codelinc.dental.dto;

import jakarta.validation.constraints.Size;

/**
 * A small, trusted carry-over describing the procedure the analyzer already resolved on a previous
 * turn but could not yet price because it was waiting on more input (today: a tooth number).
 *
 * <p>This is the backend's way of giving a multi-turn conversation to a stateless endpoint. When
 * {@code AnalysisService} returns a {@link AnalysisResponse.Kind#CLARIFICATION} asking "which tooth?",
 * it attaches a {@code PendingProcedure}. The client echoes it back on the next
 * {@link AnalyzeRequest} so a bare follow-up like {@code "19"} can be merged with the remembered
 * procedure instead of being re-interpreted from scratch.
 *
 * <p><strong>Trust note.</strong> The {@code cdtCode} here is one the backend itself produced by
 * resolving the catalog on the prior turn — it is <em>not</em> a client-authored code. The analyzer
 * still re-validates it against trusted catalog data before pricing, so echoing it back cannot let a
 * caller inject an arbitrary procedure. No price, coverage, or usage is ever carried here.
 *
 * @param cdtCode       the trusted CDT code the analyzer resolved last turn (e.g. {@code D2740})
 * @param procedureName the canonical catalog name (e.g. {@code Crown}), for a human-readable prompt
 */
public record PendingProcedure(
        @Size(max = 16, message = "pending.cdtCode must be at most 16 characters")
        String cdtCode,

        @Size(max = 128, message = "pending.procedureName must be at most 128 characters")
        String procedureName,

        // The tooth already given, so a confirming "yes" doesn't have to repeat it. Re-checked below.
        Integer toothNumber
) {

    /** A pending procedure with no tooth yet (the tooth is what is being asked for). */
    public PendingProcedure(String cdtCode, String procedureName) {
        this(cdtCode, procedureName, null);
    }

    /** The carried tooth, if it is a valid Universal tooth number (1 to 32); otherwise null. */
    public Integer validToothNumber() {
        return toothNumber != null && toothNumber >= 1 && toothNumber <= 32 ? toothNumber : null;
    }
    /** True when this carry-over actually names a procedure (a non-blank CDT code). */
    public boolean hasProcedure() {
        return cdtCode != null && !cdtCode.isBlank();
    }
}
