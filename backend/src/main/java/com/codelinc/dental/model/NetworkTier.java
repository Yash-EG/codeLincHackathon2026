package com.codelinc.dental.model;

/**
 * Whether a cost estimate is calculated under a plan's in-network or out-of-network rules.
 *
 * <p>This mirrors the {@code network_tier TEXT CHECK (... IN ('IN_NETWORK', 'OUT_OF_NETWORK'))}
 * values used throughout the Neon schema ({@code benefit_claims}, {@code treatment_plan_items})
 * and the frontend {@code NetworkTier} union in {@code types/domain.ts}. The constant names match
 * those strings exactly so JPA can map the column with {@code @Enumerated(EnumType.STRING)} and
 * Jackson serializes them straight into the frontend shape.
 *
 * <p>This is the single backend representation of a schema-level enum, not a competing definition
 * of a teammate-owned type. If JPA entities later need the same concept, they should reuse this
 * enum rather than redeclaring it.
 */
public enum NetworkTier {
    IN_NETWORK,
    OUT_OF_NETWORK
}
