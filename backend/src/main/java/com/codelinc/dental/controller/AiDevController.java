package com.codelinc.dental.controller;

import com.codelinc.dental.dto.IntentRequest;
import com.codelinc.dental.dto.ProcedureExplanationRequest;
import com.codelinc.dental.dto.ProcedureExplanationResponse;
import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.IntentExtractor;
import com.codelinc.dental.service.ProcedureExplanationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Development endpoints that expose the AI layer directly so it can be integration-tested
 * without the full orchestration flow.
 *
 * <ul>
 *   <li>{@code POST /api/ai/intent} — classify a user message into the backend-owned
 *       {@link DentalIntent} (same type the orchestrator consumes).</li>
 *   <li>{@code POST /api/ai/explain-procedure} — turn trusted procedure text into a
 *       plain-language {@link ProcedureExplanationResponse}.</li>
 * </ul>
 *
 * <p>Thin pass-throughs reusing the shared validation and {@code GlobalExceptionHandler}.
 * Business orchestration remains {@code AnalysisService}'s responsibility.
 */
@RestController
@RequestMapping("/api/ai")
public class AiDevController {

    private final IntentExtractor intentExtractor;
    private final ProcedureExplanationService procedureExplanationService;

    public AiDevController(IntentExtractor intentExtractor,
                           ProcedureExplanationService procedureExplanationService) {
        this.intentExtractor = intentExtractor;
        this.procedureExplanationService = procedureExplanationService;
    }

    @PostMapping("/intent")
    public DentalIntent extractIntent(@Valid @RequestBody IntentRequest request) {
        return intentExtractor.interpret(request.message());
    }

    @PostMapping("/explain-procedure")
    public ProcedureExplanationResponse explainProcedure(
            @Valid @RequestBody ProcedureExplanationRequest request) {
        return procedureExplanationService.explain(request);
    }
}
