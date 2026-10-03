package com.codelinc.dental.service;

import com.codelinc.dental.config.AwsBedrockProperties;
import com.codelinc.dental.exception.AiServiceException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseOutput;
import software.amazon.awssdk.services.bedrockruntime.model.Message;

import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link BedrockAiService} using a mocked {@link BedrockRuntimeClient},
 * so no real AWS call is made.
 */
@ExtendWith(MockitoExtension.class)
class BedrockAiServiceTest {

    @Mock
    private BedrockRuntimeClient client;

    private final AwsBedrockProperties properties =
            new AwsBedrockProperties("us-east-2", "us.amazon.nova-2-lite-v1:0");

    @Test
    void returnsModelText() {
        BedrockAiService svc = new BedrockAiService(client, properties);

        ConverseResponse response = ConverseResponse.builder()
                .output(ConverseOutput.builder()
                        .message(Message.builder()
                                .content(ContentBlock.fromText("Java Bedrock integration works."))
                                .build())
                        .build())
                .build();

        when(client.converse(ArgumentMatchers.<Consumer<ConverseRequest.Builder>>any())).thenReturn(response);

        String result = svc.generateText("hi");

        assertThat(result).isEqualTo("Java Bedrock integration works.");
    }

    @Test
    void wrapsClientFailureAsAiServiceException() {
        BedrockAiService svc = new BedrockAiService(client, properties);

        when(client.converse(ArgumentMatchers.<Consumer<ConverseRequest.Builder>>any()))
                .thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> svc.generateText("hi"))
                .isInstanceOf(AiServiceException.class)
                .hasMessageContaining("Failed to get a response");
    }
}
