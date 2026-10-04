package com.codelinc.dental.service;

import com.codelinc.dental.dto.DentalIntent;
import com.codelinc.dental.service.prompt.IntentExtractionPrompt;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/**
 * Default {@link IntentExtractionService}: builds the intent-extraction prompt, sends it
 * through {@link AiService} (Bedrock Converse), and parses the model's text into a
 * {@link DentalIntent} via {@link DentalIntentParser}.
 *
 * <p>Failure semantics:
 * <ul>
 *   <li>If the model returns malformed or non-JSON text, the parser returns a safe
 *       {@code UNKNOWN + needsClarification} intent (no exception).</li>
 *   <li>If the Bedrock call itself fails, the {@code AiServiceException} propagates and
 *       the global handler turns it into a clean HTTP 502 — this is a transport failure,
 *       distinct from a confusing-but-successful model response.</li>
 * </ul>
 */
@Service
public class BedrockIntentExtractionService implements IntentExtractionService {

    private final AiService aiService;
    private final DentalIntentParser parser;

    public BedrockIntentExtractionService(AiService aiService, ObjectMapper objectMapper) {
        this.aiService = aiService;
        this.parser = new DentalIntentParser(objectMapper);
    }

    @Override
    public DentalIntent extractIntent(String userMessage) {
        String raw = aiService.generateText(
                IntentExtractionPrompt.SYSTEM,
                IntentExtractionPrompt.user(userMessage));
        return parser.parse(raw, userMessage);
    }
}
