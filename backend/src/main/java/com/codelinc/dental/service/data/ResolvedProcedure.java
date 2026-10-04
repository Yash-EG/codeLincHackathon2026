package com.codelinc.dental.service.data;

/**
 * A procedure resolved against <strong>trusted</strong> catalog data from a user's spoken term.
 *
 * <p>Backend-owned data-access port return type. This is the authoritative identity of a procedure
 * (its real CDT code, canonical name, and whether it is tooth-specific), obtained by matching the
 * user's/AI's spoken name or alias against {@code cdt_procedures.common_aliases}. The orchestrator
 * uses this — never the AI's guessed code — as the thing it prices.
 *
 * @param cdtCode         the trusted CDT code (e.g. {@code D2740})
 * @param canonicalName   the catalog short name (e.g. {@code Crown})
 * @param isToothSpecific whether a tooth number is required to price it
 */
public record ResolvedProcedure(
        String cdtCode,
        String canonicalName,
        boolean isToothSpecific
) {
}
