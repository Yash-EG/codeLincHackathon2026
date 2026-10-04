package com.codelinc.dental.service;

import com.codelinc.dental.dto.DentalIntent;
import com.codelinc.dental.dto.IntentType;
import com.codelinc.dental.dto.NetworkPreference;
import com.codelinc.dental.exception.AiServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Offline tests for {@link BedrockIntentExtractionService}. The {@link AiService} is
 * mocked to return canned model JSON, so no real Bedrock call is made and the mapping
 * from utterance -> DentalIntent is deterministic.
 */
class BedrockIntentExtractionServiceTest {

    private final AiService aiService = mock(AiService.class);
    private final BedrockIntentExtractionService service =
            new BedrockIntentExtractionService(aiService, new ObjectMapper());

    private void whenModelReturns(String json) {
        when(aiService.generateText(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(json);
    }

    @Test
    void mapsNetworkComparisonUtterance() {
        whenModelReturns("""
                {"intent":"NETWORK_COMPARISON","networkPreference":"COMPARE",
                 "confidence":"HIGH","needsClarification":false,
                 "procedures":[{"nameHint":"crown","normalizedName":"crown","quantity":1,"toothNumber":null}]}
                """);

        DentalIntent intent = service.extractIntent("Is a crown cheaper in or out of network?");

        assertThat(intent.intent()).isEqualTo(IntentType.NETWORK_COMPARISON);
        assertThat(intent.networkPreference()).isEqualTo(NetworkPreference.COMPARE);
        assertThat(intent.procedures()).hasSize(1);
        assertThat(intent.rawUserText()).isEqualTo("Is a crown cheaper in or out of network?");
    }

    @Test
    void mapsProcedureExplanationUtterance() {
        whenModelReturns("""
                {"intent":"PROCEDURE_EXPLANATION","networkPreference":"UNSPECIFIED",
                 "confidence":"HIGH","needsClarification":false,"procedures":[]}
                """);

        DentalIntent intent = service.extractIntent("What does a root canal actually mean?");

        assertThat(intent.intent()).isEqualTo(IntentType.PROCEDURE_EXPLANATION);
        assertThat(intent.needsClarification()).isFalse();
    }

    @Test
    void routesDiagnosisRequestToMedicalHelpWithoutClarifying() {
        whenModelReturns("""
                {"intent":"MEDICAL_HELP","networkPreference":"UNSPECIFIED",
                 "confidence":"HIGH","needsClarification":false,"procedures":[]}
                """);

        DentalIntent intent = service.extractIntent("My tooth hurts, do I need a root canal?");

        assertThat(intent.intent()).isEqualTo(IntentType.MEDICAL_HELP);
        assertThat(intent.needsClarification()).isFalse();
        assertThat(intent.clarificationQuestion()).isNull();
    }

    @Test
    void ambiguousUtteranceFallsBackToClarification() {
        whenModelReturns("""
                {"intent":"UNKNOWN","networkPreference":"UNSPECIFIED",
                 "confidence":"LOW","needsClarification":true,
                 "clarificationQuestion":"What would you like help with?","procedures":[]}
                """);

        DentalIntent intent = service.extractIntent("help");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.clarificationQuestion()).isNotBlank();
    }

    @Test
    void garbageModelOutputStillYieldsSafeIntent() {
        whenModelReturns("I'm sorry, I can't do that.");

        DentalIntent intent = service.extractIntent("whatever");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.rawUserText()).isEqualTo("whatever");
    }

    @Test
    void bedrockTransportFailurePropagates() {
        when(aiService.generateText(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new AiServiceException("Failed to get a response from the AI model.", null));

        assertThatThrownBy(() -> service.extractIntent("anything"))
                .isInstanceOf(AiServiceException.class);
    }
}
