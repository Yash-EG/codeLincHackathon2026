package com.codelinc.dental.intent;

/**
 * The kind of question the user is asking, as classified from their natural-language message.
 *
 * <p>Part of the <strong>backend-owned AI-intent boundary</strong>: the fixed vocabulary the AI maps
 * free text onto. The backend branches on these values; anything outside the supported set resolves
 * to a clarification rather than a guess.
 *
 * <p><strong>Scope note (hackathon):</strong> deliberately only two values. A supported cost question
 * is always answered as an in- vs out-of-network comparison, so there is no separate
 * "network comparison" vs "plain estimate" distinction for the AI to classify.
 *
 * <p><strong>Contract note for the AI owner:</strong> if your classifier defines an equivalent enum,
 * we converge on one definition.
 */
public enum DentalIntentType {
    /** "How much does this procedure cost?" — answered as an in- vs out-of-network comparison. */
    COST_ESTIMATE,
    /** Anything the orchestrator cannot act on yet. Always resolved to a clarification. */
    UNSUPPORTED
}
