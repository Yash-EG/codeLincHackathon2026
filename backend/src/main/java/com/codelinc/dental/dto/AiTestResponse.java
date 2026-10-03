package com.codelinc.dental.dto;

/**
 * Response body for {@code POST /api/ai/test}.
 *
 * @param response the model's text output
 */
public record AiTestResponse(String response) {
}
