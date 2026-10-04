package com.codelinc.dental.intent;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProcedurePhrasesTest {

    @Test
    void findsEverydayWaysOfNamingAProcedure() {
        assertThat(ProcedurePhrases.findIn("How much are two root canals?")).containsExactly("Root Canal");
        assertThat(ProcedurePhrases.findIn("a porcelain crown on #19")).containsExactly("Crown");
        assertThat(ProcedurePhrases.findIn("wisdom tooth removal")).containsExactly("Extraction");
        assertThat(ProcedurePhrases.findIn("I need X-rays and a checkup")).containsExactly("X-Ray", "Exam");
        assertThat(ProcedurePhrases.findIn("cost of a cavity filling")).containsExactly("Filling");
    }

    @Test
    void theLongestPhraseWins() {
        // "deep cleaning" must not also count as a plain "cleaning".
        assertThat(ProcedurePhrases.findIn("two deep cleanings")).containsExactly("Deep Cleaning");
        assertThat(ProcedurePhrases.findIn("root canal therapy")).containsExactly("Root Canal");
    }

    @Test
    void matchesWholeWordsOnly() {
        assertThat(ProcedurePhrases.findIn("flux capacitor")).isEmpty();
        assertThat(ProcedurePhrases.findIn("an example sentence")).isEmpty();
        assertThat(ProcedurePhrases.findIn("")).isEmpty();
        assertThat(ProcedurePhrases.findIn(null)).isEmpty();
    }

    @Test
    void exactPhraseLookup() {
        assertThat(ProcedurePhrases.canonical(" Cap ")).contains("Crown");
        assertThat(ProcedurePhrases.canonical("crown")).contains("Crown");
        assertThat(ProcedurePhrases.canonical("bridge")).isEmpty();
    }
}
