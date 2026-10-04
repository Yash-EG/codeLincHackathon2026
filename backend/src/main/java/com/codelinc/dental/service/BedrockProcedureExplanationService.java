package com.codelinc.dental.service;

import com.codelinc.dental.dto.ProcedureExplanationRequest;
import com.codelinc.dental.dto.ProcedureExplanationResponse;
import com.codelinc.dental.service.prompt.ProcedureExplanationPrompt;
import org.springframework.stereotype.Service;

/**
 * Default {@link ProcedureExplanationService}: sends the trusted procedure description
 * through {@link StructuredAiService} (Bedrock) to produce a simplified, patient-friendly
 * explanation.
 *
 * <p><strong>Refuse-to-invent:</strong> if no trusted description is supplied, the
 * service does NOT call the model. It returns a safe, non-authoritative message that
 * points the user to their dentist, with {@code groundedOnTrustedInfo = false}. This
 * guarantees the AI never fabricates clinical facts about a procedure the database
 * doesn't know.
 */
@Service
public class BedrockProcedureExplanationService implements ProcedureExplanationService {

    private static final String NO_TRUSTED_INFO_MESSAGE =
            "I don't have trusted details about that specific procedure, so I can't "
            + "describe it accurately. Your dentist's office can explain exactly what "
            + "it involves. I can still help you understand your benefits or costs for a "
            + "procedure once it's identified.";

    private final StructuredAiService aiService;

    public BedrockProcedureExplanationService(StructuredAiService aiService) {
        this.aiService = aiService;
    }

    @Override
    public ProcedureExplanationResponse explain(ProcedureExplanationRequest request) {
        boolean hasTrustedInfo = request != null
                && request.plainDescription() != null
                && !request.plainDescription().isBlank();

        if (!hasTrustedInfo) {
            // Refuse to invent: no model call, no fabricated facts.
            return new ProcedureExplanationResponse(NO_TRUSTED_INFO_MESSAGE, false);
        }

        String explanation = aiService.generateText(
                ProcedureExplanationPrompt.SYSTEM,
                ProcedureExplanationPrompt.user(
                        request.shortName(),
                        request.plainDescription(),
                        request.userQuestion()));

        return new ProcedureExplanationResponse(explanation.trim(), true);
    }
}
