package com.codelinc.dental.dto;

import java.util.List;

/**
 * The backend-owned result of analyzing a user's natural-language dental-cost question.
 *
 * <p>Produced by {@code AnalysisService} and returned by the analyze endpoint. It carries exactly
 * one of two outcomes, distinguished by {@link #kind()}:
 *
 * <ul>
 *   <li>{@link Kind#ESTIMATE} — one or more completed {@link BenefitEstimate}s. Each estimate already
 *       carries its own {@link com.codelinc.dental.model.NetworkTier network label} and (once the
 *       explanation phase runs) its plain-English explanation. A network comparison is simply two
 *       estimates in {@link #estimates()}: one {@code IN_NETWORK}, one {@code OUT_OF_NETWORK}.</li>
 *   <li>{@link Kind#CLARIFICATION} — no estimate could be produced yet. {@link #clarificationQuestion()}
 *       holds a single plain-English question to put back to the user (ambiguous procedure, missing
 *       tooth, missing recommendation, unsupported intent, etc.). No calculation was performed.</li>
 * </ul>
 *
 * <p>Only the fields relevant to the active {@code kind} are populated; the others are {@code null}
 * (or empty). Use the static factories to build instances so the invariant is never violated.
 *
 * @param kind                  which outcome this response represents (never {@code null})
 * @param estimates             the structured estimates for {@link Kind#ESTIMATE}; empty otherwise
 * @param summary               optional short backend-authored summary of the estimates
 *                              ({@code null} when not applicable); the authoritative numbers always
 *                              live on each {@link BenefitEstimate}, never only in prose
 * @param clarificationQuestion the question to ask for {@link Kind#CLARIFICATION}; {@code null} otherwise
 */
public record AnalysisResponse(
        Kind kind,
        List<BenefitEstimate> estimates,
        String summary,
        String clarificationQuestion
) {
    /** Which of the two mutually exclusive outcomes an {@link AnalysisResponse} carries. */
    public enum Kind {
        /** One or more structured benefit estimates (possibly an in- vs out-of-network comparison). */
        ESTIMATE,
        /** A single clarification question; no estimate was calculated. */
        CLARIFICATION
    }

    /**
     * Builds an estimate response from one or more completed estimates.
     *
     * @param estimates the structured estimates (e.g. a single estimate, or an in/out comparison)
     * @param summary   an optional short summary; may be {@code null}
     * @return an {@link Kind#ESTIMATE} response
     */
    public static AnalysisResponse ofEstimates(List<BenefitEstimate> estimates, String summary) {
        return new AnalysisResponse(Kind.ESTIMATE, List.copyOf(estimates), summary, null);
    }

    /**
     * Builds a clarification response that asks the user a question instead of estimating.
     *
     * @param question the plain-English clarification question
     * @return a {@link Kind#CLARIFICATION} response
     */
    public static AnalysisResponse ofClarification(String question) {
        return new AnalysisResponse(Kind.CLARIFICATION, List.of(), null, question);
    }
}
