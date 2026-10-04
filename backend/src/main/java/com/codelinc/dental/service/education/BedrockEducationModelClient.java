package com.codelinc.dental.service.education;

import com.codelinc.dental.config.EducationBedrockProperties;
import com.codelinc.dental.exception.AiServiceException;
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
 * Amazon Bedrock implementation of {@link EducationModelClient} via the Converse
 * API. It reuses the shared {@link BedrockRuntimeClient} bean (region +
 * credentials) but uses the EDUCATION model ID from
 * {@link EducationBedrockProperties} and passes education-only system
 * instructions — it does not go through the general {@code AiService}.
 *
 * <p>When no education model ID is configured, {@link #isAvailable()} returns
 * false and the service uses its deterministic fallback instead.
 */
@Service
public class BedrockEducationModelClient implements EducationModelClient {

    private static final Logger log = LoggerFactory.getLogger(BedrockEducationModelClient.class);

    private final BedrockRuntimeClient client;
    private final EducationBedrockProperties properties;

    public BedrockEducationModelClient(BedrockRuntimeClient client, EducationBedrockProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public boolean isAvailable() {
        return properties.isModelConfigured();
    }

    @Override
    public String rewrite(String systemPrompt, String userPrompt) {
        Message userMessage = Message.builder()
                .role(ConversationRole.USER)
                .content(ContentBlock.fromText(userPrompt))
                .build();

        try {
            ConverseResponse response = client.converse(request -> request
                    .modelId(properties.modelId())
                    .system(SystemContentBlock.fromText(systemPrompt))
                    .messages(userMessage));
            return extractText(response);
        } catch (AiServiceException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("Education Bedrock Converse call failed for model {}", properties.modelId(), e);
            throw new AiServiceException("Failed to get a response from the education AI model.", e);
        }
    }

    private String extractText(ConverseResponse response) {
        List<ContentBlock> content = response.output().message().content();
        if (content == null || content.isEmpty()) {
            throw new AiServiceException("Education AI model returned an empty response.", null);
        }
        return content.get(0).text();
    }
}
