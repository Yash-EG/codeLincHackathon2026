package com.codelinc.dental.exception;

/**
 * A feature needs the database but the backend is running without it (no {@code db} profile).
 * {@link GlobalExceptionHandler} turns it into a 503 with a message saying how to switch it on,
 * so the rest of the API (health, education chat) keeps working.
 */
public class DatabaseUnavailableException extends RuntimeException {

    public DatabaseUnavailableException(String message) {
        super(message);
    }
}
