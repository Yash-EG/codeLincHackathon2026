package com.codelinc.dental.dto;

import java.util.List;

/**
 * Structured representation of what a user is asking, extracted by Bedrock from their
 * natural-language message. This is the primary hand-off from the AI layer (Bedrock,
 * owned here) to the orchestration/calculation layer (owned by Jay).
 *
 * <p><strong>Contract boundary (approved by the team):</strong>
 * <ul>
 *   <li>Jay consumes this object without any knowledge of Bedrock prompts or raw LLM
 *       responses.</li>
 *   <li>Bedrock populates this from <em>what the user said</em> only. It does not supply
 *       plan facts (Neon/Gopal), CDT codes, or authoritative money. {@code quotedCost}
 *       is strictly the figure the <em>user</em> stated, never a calculated value.</li>
 *   <li>When intent or a procedure cannot be confidently determined, Bedrock sets
 *       {@link #needsClarification()} and {@link #clarificationQuestion()} rather than
 *       guessing. {@link #confidence()} supports the same fallback routing.</li>
 * </ul>
 *
 * @param intent               the classified request type
 * @param procedures           procedures the user referenced; empty list if none
 * @param networkPreference    which network scenario the user asked about
 * @param appointmentReference free-text reference to a visit (e.g. "at my last
 *                             appointment"), or {@code null}
 * @param timing               the user's own timing words (e.g. "November", "before
 *                             January"), or {@code null}; Jay interprets any plan-year math
 * @param quotedCost           a cost figure the user stated themselves, as a string, or
 *                             {@code null}; NOT authoritative and never calculated here
 * @param needsClarification   true when the caller should ask the user a follow-up before
 *                             proceeding
 * @param clarificationQuestion a single concrete follow-up question when
 *                             {@code needsClarification} is true, otherwise {@code null}
 * @param confidence           Bedrock's confidence in this extraction
 * @param rawUserText          the original user message, echoed for traceability/debugging
 */
public record DentalIntent(
        IntentType intent,
        List<ProcedureRequest> procedures,
        NetworkPreference networkPreference,
        String appointmentReference,
        String timing,
        String quotedCost,
        boolean needsClarification,
        String clarificationQuestion,
        Confidence confidence,
        String rawUserText
) {
}
