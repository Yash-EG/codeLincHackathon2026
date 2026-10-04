package com.codelinc.dental.intent;

/**
 * The structured interpretation of a user's natural-language dental question, produced by the AI.
 *
 * <p>This is the top-level type of the <strong>backend-owned AI-intent boundary</strong>. The AI maps
 * free text onto this shape; the backend then does all the trusted work (resolving the procedure,
 * verifying the recommendation, loading plan/usage, calculating). <strong>Nothing on this object is
 * treated as proof</strong> of price, coverage, or that a procedure was recommended — it only tells
 * the backend what to go and verify.
 *
 * <p>{@code appointmentReference} captures how the user referred to the procedure's origin. The value
 * {@code "recommended"} means the user claims a dentist recommended it ("the crown my dentist
 * recommended"); the backend must then confirm a recent appointment actually recommended that
 * procedure before pricing it. A {@code null} value means the user made no such claim.
 *
 * <p><strong>Scope note (hackathon):</strong> there is intentionally no per-network request field.
 * A supported cost question always yields an in- vs out-of-network comparison, so the AI only has to
 * classify the intent type and extract the procedure — one less thing to get right.
 *
 * <p><strong>Contract note for the AI owner:</strong> this is the port the orchestrator consumes
 * today. If your {@code DentalIntent} already exists, we converge on a single definition instead of
 * maintaining two.
 *
 * @param type                 what kind of question this is
 * @param procedure            the (unverified) procedure the user referred to; may be {@code null}
 *                             when the AI could not extract one
 * @param appointmentReference how the procedure's origin was described, e.g. {@code "recommended"};
 *                             {@code null} if the user did not reference an appointment
 */
public record DentalIntent(
        DentalIntentType type,
        ProcedureReference procedure,
        String appointmentReference
) {
    /** The sentinel appointment reference meaning "a dentist recommended this". */
    public static final String RECOMMENDED = "recommended";

    /** True when the user claims this procedure was recommended at an appointment. */
    public boolean claimsRecommendation() {
        return RECOMMENDED.equalsIgnoreCase(appointmentReference);
    }
}
