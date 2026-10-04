package com.codelinc.dental.controller;

import com.codelinc.dental.dto.education.EducationChatRequest;
import com.codelinc.dental.dto.education.EducationChatResponse;
import com.codelinc.dental.service.education.EducationChatService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * HTTP entry point for the benefits-EDUCATION chatbot.
 *
 * <p>{@code POST /api/education/chat} with {@code {"message":"..."}} returns an
 * {@link EducationChatResponse}. This is a separate capability from the
 * procedure-intent/estimate flow: it has its own service, system prompt, and
 * configurable model ID.
 *
 * <p><b>UI integration point:</b> the frontend home for this chatbot is the
 * Imaging tab ("Decode your plan"), which already explains coverage in plain
 * English. The endpoint itself is UI-agnostic; the response fields
 * ({@code intent}, {@code personalPlanDataAvailable}, {@code estimateHandoff})
 * let that tab render an answered question, a "your amounts aren't available
 * yet" state, an estimate handoff, or an out-of-scope reply.
 *
 * <p>Example:
 * <pre>
 * curl -X POST http://localhost:8080/api/education/chat \
 *   -H "Content-Type: application/json" \
 *   -d '{"message":"What is a deductible?"}'
 *
 * {
 *   "intent": "GENERAL_DEFINITION",
 *   "answer": "In general: A deductible is the amount you may need to pay ...",
 *   "personalPlanDataAvailable": null,
 *   "estimateHandoff": false,
 *   "termsUsed": ["deductible"],
 *   "modelUsed": false
 * }
 * </pre>
 */
@RestController
@RequestMapping("/api/education")
public class EducationChatController {

    private final EducationChatService service;

    public EducationChatController(EducationChatService service) {
        this.service = service;
    }

    @PostMapping("/chat")
    public EducationChatResponse chat(@Valid @RequestBody EducationChatRequest request) {
        return service.answer(request.message());
    }
}
