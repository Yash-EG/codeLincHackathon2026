package com.codelinc.dental.intent;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KeywordIntentExtractorTest {

    private final KeywordIntentExtractor extractor = new KeywordIntentExtractor();

    @Test
    void readsACostQuestion() {
        DentalIntent intent = extractor.interpret("How much would a crown on tooth 19 cost?");
        assertThat(intent.type()).isEqualTo(DentalIntentType.COST_ESTIMATE);
        assertThat(intent.procedure().spokenName()).isEqualTo("Crown");
        // The tooth is read by AnalysisService from the message itself.
        assertThat(intent.procedure().toothNumber()).isNull();
        assertThat(intent.claimsRecommendation()).isFalse();
    }

    @Test
    void notesWhenTheDentistRecommendedIt() {
        assertThat(extractor.interpret("My dentist recommended a root canal").claimsRecommendation()).isTrue();
    }

    @Test
    void passesSeveralProceduresOnSoTheResolverCanAsk() {
        assertThat(extractor.interpret("crown or implant?").procedure().spokenName()).isEqualTo("Crown or Implant");
    }

    @Test
    void anythingElseIsUnsupported() {
        assertThat(extractor.interpret("what's the weather").type()).isEqualTo(DentalIntentType.UNSUPPORTED);
        assertThat(extractor.interpret("  ").type()).isEqualTo(DentalIntentType.UNSUPPORTED);
    }
}
