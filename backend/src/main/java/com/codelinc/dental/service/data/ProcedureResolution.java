package com.codelinc.dental.service.data;

import java.util.List;

/**
 * The outcome of resolving a spoken procedure term against trusted catalog data.
 *
 * <p>Resolution has three distinct outcomes the orchestrator must handle differently:
 * <ul>
 *   <li>{@link Outcome#RESOLVED} — exactly one trusted procedure matched; {@link #procedure()} is set.</li>
 *   <li>{@link Outcome#UNKNOWN} — no procedure matched the term; ask the user to rephrase.</li>
 *   <li>{@link Outcome#AMBIGUOUS} — several procedures matched; {@link #candidates()} lists them so
 *       the user can disambiguate.</li>
 * </ul>
 *
 * @param outcome    which of the three outcomes occurred
 * @param procedure  the single trusted match for {@link Outcome#RESOLVED}; {@code null} otherwise
 * @param candidates the matching candidates for {@link Outcome#AMBIGUOUS}; empty otherwise
 */
public record ProcedureResolution(
        Outcome outcome,
        ResolvedProcedure procedure,
        List<ResolvedProcedure> candidates
) {
    public enum Outcome { RESOLVED, UNKNOWN, AMBIGUOUS }

    public static ProcedureResolution resolved(ResolvedProcedure procedure) {
        return new ProcedureResolution(Outcome.RESOLVED, procedure, List.of());
    }

    public static ProcedureResolution unknown() {
        return new ProcedureResolution(Outcome.UNKNOWN, null, List.of());
    }

    public static ProcedureResolution ambiguous(List<ResolvedProcedure> candidates) {
        return new ProcedureResolution(Outcome.AMBIGUOUS, null, List.copyOf(candidates));
    }
}
