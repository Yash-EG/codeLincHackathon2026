package com.codelinc.dental.service.education;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Loads and serves the reviewed benefits glossary from
 * {@code resources/education/glossary.json}.
 *
 * <p>The glossary is the ONLY source of definitions the chatbot is allowed to
 * state. Matching is deterministic (alias contains-match against the question
 * text), so general questions work with no model and no account data.
 */
@Component
public class Glossary {

    /** Shape of the JSON file: {@code { "terms": [ ... ] }}. */
    private record GlossaryFile(List<GlossaryTerm> terms) {
    }

    private final Map<String, GlossaryTerm> termsByKey;
    private final List<GlossaryTerm> terms;

    public Glossary() {
        this("education/glossary.json");
    }

    /** Package-visible constructor so tests can point at a fixture if needed. */
    Glossary(String classpathLocation) {
        this.terms = load(classpathLocation);
        Map<String, GlossaryTerm> byKey = new LinkedHashMap<>();
        for (GlossaryTerm t : terms) {
            byKey.put(t.key(), t);
        }
        this.termsByKey = Collections.unmodifiableMap(byKey);
    }

    private static List<GlossaryTerm> load(String classpathLocation) {
        ObjectMapper mapper = new ObjectMapper()
                .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        try (InputStream in = new ClassPathResource(classpathLocation).getInputStream()) {
            GlossaryFile file = mapper.readValue(in, GlossaryFile.class);
            if (file.terms() == null || file.terms().isEmpty()) {
                throw new IllegalStateException("Glossary resource is empty: " + classpathLocation);
            }
            return List.copyOf(file.terms());
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load glossary resource: " + classpathLocation, e);
        }
    }

    /** All reviewed terms, in file order. */
    public List<GlossaryTerm> all() {
        return terms;
    }

    public Optional<GlossaryTerm> byKey(String key) {
        return Optional.ofNullable(termsByKey.get(key));
    }

    /**
     * Returns every glossary term whose name or an alias appears in the given
     * text, in the glossary's own order. Case-insensitive, substring match.
     * Longer matches take precedence implicitly because callers can inspect the
     * list; the first element is the best single answer for a definition.
     */
    public List<GlossaryTerm> findMatches(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String haystack = text.toLowerCase(Locale.ROOT);
        List<GlossaryTerm> matches = new ArrayList<>();
        for (GlossaryTerm term : terms) {
            if (matchesTerm(term, haystack)) {
                matches.add(term);
            }
        }
        return matches;
    }

    private static boolean matchesTerm(GlossaryTerm term, String haystack) {
        if (haystack.contains(term.term().toLowerCase(Locale.ROOT))) {
            return true;
        }
        if (term.aliases() == null) {
            return false;
        }
        for (String alias : term.aliases()) {
            if (!alias.isBlank() && haystack.contains(alias.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}
