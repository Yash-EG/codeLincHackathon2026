package com.codelinc.dental.service;

import com.codelinc.dental.dto.ProcedureExplanationRequest;
import com.codelinc.dental.dto.ProcedureExplanationResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Offline tests for {@link BedrockProcedureExplanationService}. {@link AiService} is
 * mocked, so no real Bedrock call happens.
 */
class BedrockProcedureExplanationServiceTest {

    private final StructuredAiService aiService = mock(StructuredAiService.class);
    private final BedrockProcedureExplanationService service =
            new BedrockProcedureExplanationService(aiService);

    @Test
    void simplifiesTrustedDescription() {
        when(aiService.generateText(anyString(), anyString()))
                .thenReturn("  A crown is a cap that covers a damaged tooth to protect it.  ");

        ProcedureExplanationResponse response = service.explain(
                new ProcedureExplanationRequest(
                        "Crown",
                        "A prosthetic restoration that caps a tooth to restore shape and function.",
                        null));

        assertThat(response.groundedOnTrustedInfo()).isTrue();
        assertThat(response.explanation())
                .isEqualTo("A crown is a cap that covers a damaged tooth to protect it.");
    }

    @Test
    void refusesToInventWhenNoTrustedDescription() {
        ProcedureExplanationResponse response = service.explain(
                new ProcedureExplanationRequest("Mystery Procedure", "   ", null));

        assertThat(response.groundedOnTrustedInfo()).isFalse();
        assertThat(response.explanation()).contains("don't have trusted details");
        // Critically, the model must NOT be called when there is no trusted info.
        verify(aiService, never()).generateText(anyString(), anyString());
    }

    @Test
    void refusesToInventWhenDescriptionIsNull() {
        ProcedureExplanationResponse response = service.explain(
                new ProcedureExplanationRequest("X", null, "does it hurt?"));

        assertThat(response.groundedOnTrustedInfo()).isFalse();
        verify(aiService, never()).generateText(anyString(), anyString());
    }

    @Test
    void passesUserQuestionThroughWhenPresent() {
        when(aiService.generateText(anyString(), anyString()))
                .thenReturn("It's usually done with numbing, so you shouldn't feel pain.");

        ProcedureExplanationResponse response = service.explain(
                new ProcedureExplanationRequest(
                        "Root canal",
                        "Endodontic treatment that removes infected pulp from inside the tooth.",
                        "does it hurt?"));

        assertThat(response.groundedOnTrustedInfo()).isTrue();
        assertThat(response.explanation()).isNotBlank();
    }
}
