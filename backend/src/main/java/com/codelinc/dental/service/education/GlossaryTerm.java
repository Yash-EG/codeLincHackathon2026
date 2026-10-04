package com.codelinc.dental.service.education;

import java.util.List;

/**
 * One reviewed, general dental-insurance definition loaded from
 * {@code resources/education/glossary.json}.
 *
 * <p>These are deliberately GENERAL concepts (what a deductible is), never
 * plan-specific rules or dollar amounts. The education model may rewrite the
 * {@code definition} in plainer language but must not invent new ones.
 *
 * @param key        stable identifier, e.g. {@code "deductible"}
 * @param aliases    lowercase phrases that should match this term in a question
 * @param term       display name, e.g. {@code "Deductible"}
 * @param definition the reviewed plain-language definition
 */
public record GlossaryTerm(
        String key,
        List<String> aliases,
        String term,
        String definition
) {
}
