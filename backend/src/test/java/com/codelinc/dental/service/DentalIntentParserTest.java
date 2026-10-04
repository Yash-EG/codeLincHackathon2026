package com.codelinc.dental.service;

import com.codelinc.dental.dto.Confidence;
import com.codelinc.dental.dto.DentalIntent;
import com.codelinc.dental.dto.IntentType;
import com.codelinc.dental.dto.NetworkPreference;
import com.codelinc.dental.dto.ProcedureRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Offline tests for {@link DentalIntentParser}. No Bedrock, no Spring context.
 */
class DentalIntentParserTest {

    private final DentalIntentParser parser = new DentalIntentParser(new ObjectMapper());

    @Test
    void parsesWellFormedJson() {
        String json = """
                {
                  "intent": "NETWORK_COMPARISON",
                  "procedures": [
                    {"nameHint": "a cap", "normalizedName": "crown", "quantity": 1, "toothNumber": 19}
                  ],
                  "networkPreference": "COMPARE",
                  "appointmentReference": "recommended at my last appointment",
                  "timing": null,
                  "quotedCost": null,
                  "needsClarification": false,
                  "clarificationQuestion": null,
                  "confidence": "HIGH"
                }
                """;

        DentalIntent intent = parser.parse(json, "is a cap cheaper in or out of network?");

        assertThat(intent.intent()).isEqualTo(IntentType.NETWORK_COMPARISON);
        assertThat(intent.networkPreference()).isEqualTo(NetworkPreference.COMPARE);
        assertThat(intent.confidence()).isEqualTo(Confidence.HIGH);
        assertThat(intent.needsClarification()).isFalse();
        assertThat(intent.appointmentReference()).isEqualTo("recommended at my last appointment");
        assertThat(intent.rawUserText()).isEqualTo("is a cap cheaper in or out of network?");
        assertThat(intent.procedures()).hasSize(1);
        ProcedureRequest p = intent.procedures().get(0);
        assertThat(p.nameHint()).isEqualTo("a cap");
        assertThat(p.normalizedName()).isEqualTo("crown");
        assertThat(p.quantity()).isEqualTo(1);
        assertThat(p.toothNumber()).isEqualTo(19);
    }

    @Test
    void extractsJsonWrappedInCodeFencesAndProse() {
        String raw = """
                Sure! Here is the classification:
                ```json
                {"intent":"PROCEDURE_EXPLANATION","procedures":[],
                 "networkPreference":"UNSPECIFIED","needsClarification":false,
                 "confidence":"HIGH"}
                ```
                Hope that helps.
                """;

        DentalIntent intent = parser.parse(raw, "what does a root canal mean?");

        assertThat(intent.intent()).isEqualTo(IntentType.PROCEDURE_EXPLANATION);
        assertThat(intent.needsClarification()).isFalse();
        assertThat(intent.confidence()).isEqualTo(Confidence.HIGH);
    }

    @Test
    void coercesEnumsCaseInsensitivelyAndDefaultsUnknownValues() {
        String json = """
                {"intent":"benefit_estimate","networkPreference":"in_network",
                 "confidence":"high","procedures":[],"needsClarification":false}
                """;

        DentalIntent intent = parser.parse(json, "how much will my filling cost");

        assertThat(intent.intent()).isEqualTo(IntentType.BENEFIT_ESTIMATE);
        assertThat(intent.networkPreference()).isEqualTo(NetworkPreference.IN_NETWORK);
        assertThat(intent.confidence()).isEqualTo(Confidence.HIGH);
    }

    @Test
    void invalidEnumValuesFallBackToSafeDefaults() {
        String json = """
                {"intent":"WAT","networkPreference":"SOMETHING","confidence":"MAYBE",
                 "procedures":[],"needsClarification":false}
                """;

        DentalIntent intent = parser.parse(json, "???");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.networkPreference()).isEqualTo(NetworkPreference.UNSPECIFIED);
        assertThat(intent.confidence()).isEqualTo(Confidence.LOW);
        // UNKNOWN forces clarification
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.clarificationQuestion()).isNotBlank();
    }

    @Test
    void defaultsProcedureQuantityAndRejectsOutOfRangeTooth() {
        String json = """
                {"intent":"BENEFIT_ESTIMATE","confidence":"MEDIUM","needsClarification":false,
                 "networkPreference":"UNSPECIFIED",
                 "procedures":[{"nameHint":"fillings","normalizedName":"Filling","quantity":0,
                                "toothNumber":99}]}
                """;

        DentalIntent intent = parser.parse(json, "I need some fillings");

        ProcedureRequest p = intent.procedures().get(0);
        assertThat(p.quantity()).isEqualTo(1);          // 0 -> default 1
        assertThat(p.toothNumber()).isNull();            // 99 out of 1-32 range
        assertThat(p.normalizedName()).isEqualTo("filling"); // lowercased
    }

    @Test
    void nonJsonOutputFallsBackToUnknownWithClarification() {
        DentalIntent intent = parser.parse("I'm not sure what you mean, sorry!", "blah");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.clarificationQuestion()).isNotBlank();
        assertThat(intent.confidence()).isEqualTo(Confidence.LOW);
        assertThat(intent.rawUserText()).isEqualTo("blah");
    }

    @Test
    void malformedJsonFallsBackToUnknown() {
        DentalIntent intent = parser.parse("{\"intent\": \"BENEFIT_ESTIMATE\", ", "oops");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.rawUserText()).isEqualTo("oops");
    }

    @Test
    void nullModelOutputFallsBackSafely() {
        DentalIntent intent = parser.parse(null, "hi");

        assertThat(intent.intent()).isEqualTo(IntentType.UNKNOWN);
        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.rawUserText()).isEqualTo("hi");
    }

    @Test
    void lowConfidenceForcesClarificationEvenIfModelSaidFalse() {
        String json = """
                {"intent":"BENEFIT_ESTIMATE","confidence":"LOW","needsClarification":false,
                 "networkPreference":"UNSPECIFIED","procedures":[]}
                """;

        DentalIntent intent = parser.parse(json, "uh");

        assertThat(intent.needsClarification()).isTrue();
        assertThat(intent.clarificationQuestion()).isNotBlank();
    }

    @Test
    void medicalHelpIsRoutedNotClarified() {
        String json = """
                {"intent":"MEDICAL_HELP","confidence":"HIGH","needsClarification":true,
                 "clarificationQuestion":"what hurts?","networkPreference":"UNSPECIFIED",
                 "procedures":[]}
                """;

        DentalIntent intent = parser.parse(json, "my tooth hurts, do I need a root canal?");

        assertThat(intent.intent()).isEqualTo(IntentType.MEDICAL_HELP);
        // MEDICAL_HELP must not be treated as a clarification case
        assertThat(intent.needsClarification()).isFalse();
        assertThat(intent.clarificationQuestion()).isNull();
    }
}
