package com.codelinc.dental.dto;

/**
 * Bedrock's self-reported confidence in an extracted {@link DentalIntent}.
 *
 * <p>Used for fallback routing: {@code LOW} (and often {@code MEDIUM}) should steer the
 * caller toward asking the user a clarifying question instead of proceeding straight to
 * benefit calculations.
 */
public enum Confidence {
    HIGH,
    MEDIUM,
    LOW
}
