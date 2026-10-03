package com.codelinc.dental.exception;

/**
 * Raised when an AI/Bedrock call fails. The global exception handler translates this
 * into a clean JSON error response (HTTP 502) instead of leaking a Java stack trace.
 */
public class AiServiceException extends RuntimeException {

    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
