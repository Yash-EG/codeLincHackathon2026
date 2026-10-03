package com.codelinc.dental.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Standard JSON error body returned by the global exception handler.
 *
 * @param timestamp when the error occurred
 * @param status    HTTP status code
 * @param error     short error label
 * @param message   human-readable message
 * @param fieldErrors optional map of field name to validation message (may be null)
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        Map<String, String> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(Instant.now(), status, error, message, null);
    }

    public static ErrorResponse of(int status, String error, String message, Map<String, String> fieldErrors) {
        return new ErrorResponse(Instant.now(), status, error, message, fieldErrors);
    }
}
