package com.codelinc.dental.service;

import com.codelinc.dental.exception.AiServiceException;
import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.DentalIntentType;
import com.codelinc.dental.intent.ProcedureReference;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ResilientIntentExtractorTest {

    private static BedrockIntentExtractor bedrockReturning(DentalIntent intent) {
        return new BedrockIntentExtractor(null, null) {
            @Override
            public DentalIntent interpret(String message) {
                return intent;
            }
        };
    }

    private static BedrockIntentExtractor bedrockFailing() {
        return new BedrockIntentExtractor(null, null) {
            @Override
            public DentalIntent interpret(String message) {
                throw new AiServiceException("Bedrock request failed", new RuntimeException("expired token"));
            }
        };
    }

    @Test
    void usesBedrockWhenItAnswers() {
        DentalIntent fromAi = new DentalIntent(DentalIntentType.COST_ESTIMATE,
                new ProcedureReference("Implant", "D6010", 8), null);
        assertThat(new ResilientIntentExtractor(bedrockReturning(fromAi)).interpret("implant on 8")).isSameAs(fromAi);
    }

    @Test
    void fallsBackToKeywordsWhenBedrockFails() {
        DentalIntent intent = new ResilientIntentExtractor(bedrockFailing()).interpret("How much is a crown on #19?");
        assertThat(intent.type()).isEqualTo(DentalIntentType.COST_ESTIMATE);
        assertThat(intent.procedure().spokenName()).isEqualTo("Crown");
    }
}
