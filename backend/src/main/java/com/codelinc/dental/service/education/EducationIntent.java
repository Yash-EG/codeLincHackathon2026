package com.codelinc.dental.service.education;

/**
 * How a benefits-education question is classified. Routing is deterministic for
 * this vertical slice; the dedicated model is used only to rewrite approved
 * content, never to decide scope.
 */
public enum EducationIntent {

    /** A general concept question, answerable from the reviewed glossary alone. */
    GENERAL_DEFINITION,

    /** A question about the employee's own plan (needs verified, authenticated facts). */
    PERSONAL_PLAN_QUESTION,

    /** A procedure-price or coverage-estimate question. Hand off to the estimate flow. */
    ESTIMATE_REQUEST,

    /** Anything outside dental-benefits education. */
    OUT_OF_SCOPE
}
