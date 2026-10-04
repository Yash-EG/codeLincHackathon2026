package com.codelinc.dental.controller;

import com.codelinc.dental.dto.DentalIntent;
import com.codelinc.dental.dto.IntentRequest;
import com.codelinc.dental.dto.ProcedureExplanationRequest;
import com.codelinc.dental.dto.ProcedureExplanationResponse;
import com.codelinc.dental.service.IntentExtractionService;
import com.codelinc.dental.service.ProcedureExplanationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Development endpoints that expose the AI layer so Jay (and the frontend) can integrate
 * and test it directly, without wiring through the full orchestration flow yet.
 *
 * <ul>
 *   <li>{@code POST /api/ai/intent} — classify a user message into a {@link DentalIntent}.</li>
 *   <li>{@code POST /api/ai/explain-procedure} — turn trusted procedure text into a
 *       plain-language {@link ProcedureExplanationResponse}.</li>
 * </ul>
 *
 * <p>These reuse the shared validation and {@code GlobalExceptionHandler}, so malformed
 * input returns a clean 400 and Bedrock transport failures a clean 502. They are thin
 * pass-throughs to the services; business orchestration remains Jay's.
 */
@RestController
@RequestMapping("/api/ai")
public class AiDevController {

    private final IntentExtractionService intentExtractionService;
    private final ProcedureExplanationService procedureExplanationService;

    public AiDevController(IntentExtractionService intentExtractionService,
                           ProcedureExplanationService procedureExplanationService) {
        this.intentExtractionService = intentExtractionService;
        this.procedureExplanationService = procedureExplanationService;
    }

    @PostMapping("/intent")
    public DentalIntent extractIntent(@Valid @RequestBody IntentRequest request) {
        return intentExtractionService.extractIntent(request.message());
    }

    @PostMapping("/explain-procedure")
    public ProcedureExplanationResponse explainProcedure(
            @Valid @RequestBody ProcedureExplanationRequest request) {
        return procedureExplanationService.explain(request);
    }
}
