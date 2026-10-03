package com.codelinc.dental.controller;

import com.codelinc.dental.dto.AiTestRequest;
import com.codelinc.dental.dto.AiTestResponse;
import com.codelinc.dental.service.AiService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Temporary development endpoint to verify the end-to-end Bedrock integration.
 *
 * <p>{@code POST /api/ai/test} with {@code {"message":"..."}} returns
 * {@code {"response":"..."}}. This is deliberately a thin pass-through; it does NOT
 * implement procedure extraction, pricing, recommendations, RAG, or memory. Those are
 * follow-up tasks once the foundation is confirmed working.
 */
@RestController
@RequestMapping("/api/ai")
public class AiTestController {

    private final AiService aiService;

    public AiTestController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/test")
    public AiTestResponse test(@Valid @RequestBody AiTestRequest request) {
        String text = aiService.generateText(request.message());
        return new AiTestResponse(text);
    }
}
