package com.codelinc.dental.dto;

/**
 * Which network cost scenario the user is asking about.
 *
 * <p>Bedrock only <em>recognizes</em> the preference from the user's words. The actual
 * in-network vs. out-of-network cost scenarios are calculated by Jay from database
 * facts; Bedrock never computes network costs.
 */
public enum NetworkPreference {

    /** User is asking specifically about in-network cost. */
    IN_NETWORK,

    /** User is asking specifically about out-of-network cost. */
    OUT_OF_NETWORK,

    /** User wants a comparison of both in- and out-of-network. */
    COMPARE,

    /** No network preference was expressed. */
    UNSPECIFIED
}
