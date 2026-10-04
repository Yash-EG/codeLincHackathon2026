package com.codelinc.dental.dto;

/**
 * The kind of thing the user is asking about, extracted by Bedrock from their
 * natural-language message.
 *
 * <p>This is a classification of <em>intent only</em>. It never carries authoritative
 * plan facts or financial figures — those come from Neon (Gopal) and the deterministic
 * calculations (Jay). Bedrock's job is to decide which of these buckets the request
 * falls into.
 */
public enum IntentType {

    /** "What does a root canal actually mean?" — explain a procedure in plain language. */
    PROCEDURE_EXPLANATION,

    /** "How much will my crown cost me?" — the user wants an out-of-pocket estimate. */
    BENEFIT_ESTIMATE,

    /** "Is it cheaper in or out of network?" — compare network cost scenarios. */
    NETWORK_COMPARISON,

    /** "When is my next cleaning?" / references to past or upcoming visits. */
    APPOINTMENT_QUESTION,

    /** "What's my annual maximum?" — questions about the plan itself. */
    PLAN_QUESTION,

    /** "Should I do this before or after January?" — timing across plan years. */
    TREATMENT_TIMING,

    /**
     * The user is asking the application to decide, medically, what treatment they need
     * or whether they need care at all.
     *
     * <p><strong>This is NOT a request to diagnose, and the system must never attempt a
     * diagnosis.</strong> When this intent is detected, the application should decline to
     * diagnose and direct the user toward a dental/medical professional, while still
     * offering to explain benefits or an already-recommended procedure.
     */
    MEDICAL_HELP,

    /**
     * Intent could not be confidently determined. The caller should treat this as a
     * signal to ask the user a clarifying question rather than proceeding with
     * calculations. See {@link DentalIntent#needsClarification()}.
     */
    UNKNOWN
}
