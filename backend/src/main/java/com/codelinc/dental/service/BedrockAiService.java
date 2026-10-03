package com.codelinc.dental.service;

import com.codelinc.dental.config.AwsBedrockProperties;
import com.codelinc.dental.exception.AiServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;

import java.util.List;

/**
 * Amazon Bedrock implementation of {@link AiService} using the Converse API.
 *
 * <p>The model ID and region are supplied by {@link AwsBedrockProperties}, so neither
 * value is hardcoded here. This stays deliberately minimal for the hackathon
 * foundation: a single prompt in, text out. No procedure extraction, pricing, RAG, or
 * conversation memory lives here yet.
 */
@Service
public class BedrockAiService implements AiService {

    private static final Logger log = LoggerFactory.getLogger(BedrockAiService.class);

    private final BedrockRuntimeClient client;
    private final AwsBedrockProperties properties;

    public BedrockAiService(BedrockRuntimeClient client, AwsBedrockProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public String generateText(String prompt) {
        Message userMessage = Message.builder()
                .role(ConversationRole.USER)
                .content(ContentBlock.fromText(prompt))
                .build();

        try {
            ConverseResponse response = client.converse(request -> request
                    .modelId(properties.modelId())
                    .messages(userMessage));

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
