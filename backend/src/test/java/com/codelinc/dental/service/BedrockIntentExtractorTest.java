package com.codelinc.dental.service;

import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.DentalIntentType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Offline tests for {@link BedrockIntentExtractor}. {@link StructuredAiService} is mocked
 * with canned model JSON, so no real Bedrock call happens and parsing into the
 * backend-owned {@link DentalIntent} is deterministic.
 */
class BedrockIntentExtractorTest {

    private final StructuredAiService ai = mock(StructuredAiService.class);
    private final BedrockIntentExtractor extractor =
            new BedrockIntentExtractor(ai, new ObjectMapper());

    private void modelReturns(String json) {
        when(ai.generateText(anyString(), anyString())).thenReturn(json);
    }

    @Test
    void parsesCostEstimateWithProcedureAndRecommendation() {
        modelReturns("""
                {"type":"COST_ESTIMATE",
                 "procedure":{"spokenName":"crown","cdtCodeHint":null,"toothNumber":19},
                 "appointmentReference":"recommended"}
                """);

        DentalIntent intent = extractor.interpret("how much is the crown my dentist recommended on tooth 19?");

        assertThat(intent.type()).isEqualTo(DentalIntentType.COST_ESTIMATE);
        assertThat(intent.procedure()).isNotNull();
        assertThat(intent.procedure().spokenName()).isEqualTo("crown");
        assertThat(intent.procedure().toothNumber()).isEqualTo(19);
        assertThat(intent.claimsRecommendation()).isTrue();
    }

    @Test
    void unsupportedWhenModelSaysSo() {
        modelReturns("""
                {"type":"UNSUPPORTED","procedure":null,"appointmentReference":null}
                """);

        DentalIntent intent = extractor.interpret("what are my benefits?");

        assertThat(intent.type()).isEqualTo(DentalIntentType.UNSUPPORTED);
        assertThat(intent.procedure()).isNull();
        assertThat(intent.claimsRecommendation()).isFalse();
    }

    @Test
    void extractsJsonFromCodeFencesAndProse() {
        modelReturns("""
                Sure:
                ```json
                {"type":"COST_ESTIMATE","procedure":{"spokenName":"filling","cdtCodeHint":null,"toothNumber":null},"appointmentReference":null}
                ```
                """);

        DentalIntent intent = extractor.interpret("what does a filling cost?");

        assertThat(intent.type()).isEqualTo(DentalIntentType.COST_ESTIMATE);
        assertThat(intent.procedure().spokenName()).isEqualTo("filling");
    }

    @Test
    void invalidTypeCoercesToUnsupported() {
        modelReturns("""
                {"type":"WHATEVER","procedure":null,"appointmentReference":null}
                """);

        assertThat(extractor.interpret("hi").type()).isEqualTo(DentalIntentType.UNSUPPORTED);
    }

    @Test
    void outOfRangeToothIsDropped() {
        modelReturns("""
                {"type":"COST_ESTIMATE",
                 "procedure":{"spokenName":"crown","cdtCodeHint":null,"toothNumber":99},
                 "appointmentReference":null}
                """);

        DentalIntent intent = extractor.interpret("crown cost");
        assertThat(intent.procedure().toothNumber()).isNull();
        assertThat(intent.procedure().spokenName()).isEqualTo("crown");
    }

    @Test
    void nonRecommendedAppointmentReferenceBecomesNull() {
        modelReturns("""
                {"type":"COST_ESTIMATE",
                 "procedure":{"spokenName":"crown","cdtCodeHint":null,"toothNumber":null},
                 "appointmentReference":"something else"}
                """);

        assertThat(extractor.interpret("x").claimsRecommendation()).isFalse();
    }

    @Test
    void garbageOutputBecomesUnsupportedNotFabricated() {
        modelReturns("I can't do that.");

        DentalIntent intent = extractor.interpret("???");
        assertThat(intent.type()).isEqualTo(DentalIntentType.UNSUPPORTED);
        assertThat(intent.procedure()).isNull();
    }

    @Test
    void malformedJsonBecomesUnsupported() {
        modelReturns("{\"type\":\"COST_ESTIMATE\", ");

        assertThat(extractor.interpret("oops").type()).isEqualTo(DentalIntentType.UNSUPPORTED);
    }
}
