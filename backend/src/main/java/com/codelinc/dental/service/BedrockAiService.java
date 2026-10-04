package com.codelinc.dental.service;

import com.codelinc.dental.config.AwsBedrockProperties;
import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.exception.AiServiceException;
import com.codelinc.dental.service.prompt.BenefitExplanationPrompt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import software.amazon.awssdk.services.bedrockruntime.model.SystemContentBlock;

import java.util.List;

/**
 * Amazon Bedrock implementation of the AI seam using the Converse API.
 *
 * <p>Implements both {@link AiService} (plain prompt + benefit-estimate explanation) and
 * {@link StructuredAiService} (system-prompted structured call used by intent extraction).
 * The model ID and region come from {@link AwsBedrockProperties} — never hardcoded.
 */
@Service
public class BedrockAiService implements AiService, StructuredAiService {

    private static final Logger log = LoggerFactory.getLogger(BedrockAiService.class);

    private final BedrockRuntimeClient client;
    private final AwsBedrockProperties properties;

    public BedrockAiService(BedrockRuntimeClient client, AwsBedrockProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public String generateText(String prompt) {
        return converse(null, prompt);
    }

    @Override
    public String generateText(String systemPrompt, String userPrompt) {
        return converse(systemPrompt, userPrompt);
    }

    /**
     * Step 8: narrate an authoritative {@link BenefitEstimate} in plain language.
     *
     * <p>Explain only — the numbers are produced by the calculator and must appear verbatim.
     * The prompt forbids recalculating, inventing figures, or guaranteeing coverage, and
     * frames the result as an estimate based on supplied plan information. Returns {@code null}
     * on failure or empty input so {@code AnalysisService} keeps the estimate unchanged.
     */
    @Override
    public String explainEstimate(BenefitEstimate estimate) {
        if (estimate == null) {
            return null;
        }
        try {
            return TextSanitizer.stripMarkdown(converse(
                    BenefitExplanationPrompt.SYSTEM,
                    BenefitExplanationPrompt.user(estimate)));
        } catch (RuntimeException e) {
            // Narration is best-effort; never let it corrupt or block the authoritative estimate.
            log.warn("explainEstimate failed for {}; returning no explanation", estimate.cdtCode(), e);
            return null;
        }
    }

    private String converse(String systemPrompt, String userPrompt) {
        Message userMessage = Message.builder()
                .role(ConversationRole.USER)
                .content(ContentBlock.fromText(userPrompt))
                .build();

        try {
            ConverseResponse response = client.converse(request -> {
                request.modelId(properties.modelId())
                        .messages(userMessage);
                if (systemPrompt != null && !systemPrompt.isBlank()) {
                    request.system(SystemContentBlock.fromText(systemPrompt));
                }
            });

            return extractText(response);
        } catch (AiServiceException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Bedrock Converse call failed for model {}", properties.modelId(), e);
            throw new AiServiceException("Failed to get a response from the AI model.", e);
        }
    }

    private String extractText(ConverseResponse response) {
        List<ContentBlock> content = response.output().message().content();
        if (content == null || content.isEmpty()) {
            throw new AiServiceException("AI model returned an empty response.", null);
        }
        return content.get(0).text();
    }
}
