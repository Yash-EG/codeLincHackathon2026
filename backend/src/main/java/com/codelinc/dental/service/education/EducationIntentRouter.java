package com.codelinc.dental.service.education;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Deterministic classifier for benefits-education questions.
 *
 * <p>Order of precedence is deliberate and conservative:
 * <ol>
 *   <li><b>ESTIMATE_REQUEST</b> — asks for a price/cost of a specific procedure
 *       ("how much will a crown cost"). These must hand off to Jay's estimate
 *       flow, never be answered here, so they win even if a glossary term also
 *       appears.</li>
 *   <li><b>PERSONAL_PLAN_QUESTION</b> — uses first-person possessives ("my",
 *       "I have") about plan amounts/benefits. Needs verified facts.</li>
 *   <li><b>GENERAL_DEFINITION</b> — a known glossary term appears and the
 *       question is not personal or an estimate.</li>
 *   <li><b>OUT_OF_SCOPE</b> — none of the above.</li>
 * </ol>
 *
 * <p>No model call is involved: routing is fast, free, and testable, and
 * general questions work with no account data.
 */
@Component
public class EducationIntentRouter {

    private final Glossary glossary;

    // "how much ... cost/pay", "price of", "estimate for", "what will X cost me", "what happens if I get X in <month>"
    private static final Pattern ESTIMATE = Pattern.compile(
            "\\b(how much|what('s| is| does| will| would)?\\s+(it|this|that|a|an|my)?\\s*(cost|charge|pay|price)"
                    + "|cost(s)?\\s+(me|to)|price(s)?\\s+(of|for)|estimate(d)?|out[- ]of[- ]pocket\\s+(cost|for)"
                    + "|co(-| )?pay\\s+(amount|for)\\s+(a|an|my)\\s+"
                    // Scenario / timing questions about care ("what happens if I get a crown in
                    // November", "should I wait until January") are also estimate territory.
                    + "|what happens if|what if i|when (should|can) i|should i (get|have|wait|do|schedule)"
                    + "|\\bin (january|february|march|april|may|june|july|august|september|october|november|december)\\b)",
            Pattern.CASE_INSENSITIVE);

    // Procedure nouns that, combined with a cost cue, mean "estimate".
    private static final Pattern PROCEDURE = Pattern.compile(
            "\\b(crown|filling|root canal|implant|extraction|cleaning|exam|x-?ray|night ?guard|"
                    + "bridge|denture|veneer|whitening|sealant|scaling|procedure)\\b",
            Pattern.CASE_INSENSITIVE);

    // First-person signals that the question is about the user's own plan.
    private static final Pattern PERSONAL = Pattern.compile(
            "\\b(my|mine|i['’]?ve|i have|do i have|am i|my plan|for me|i['’]?m enrolled)\\b",
            Pattern.CASE_INSENSITIVE);

    // "How much of my maximum is left", "have I hit my deductible": a balance, not a price.
    private static final Pattern BALANCE = Pattern.compile(
            "\\b(annual max(imum)?|max(imum)?|deductible|benefits?)\\b.*\\b(left|remaining|used|met|reached|hit|spent)\\b"
                    + "|\\b(left|remaining|used|met|reached|hit|spent)\\b.*\\b(annual max(imum)?|max(imum)?|deductible|benefits?)\\b",
            Pattern.CASE_INSENSITIVE);

    // Personal-plan topics that aren't glossary definitions on their own.
    private static final Pattern PERSONAL_TOPIC = Pattern.compile(
            "\\b(remaining|left|used|balance|how much.*(max|deductible)|covered|coverage|benefit|limit|"
                    + "max(imum)?|deductible|copay|co-?pay|coinsurance|in network|out of network|out-of-network)\\b",
            Pattern.CASE_INSENSITIVE);

    public EducationIntentRouter(Glossary glossary) {
        this.glossary = glossary;
    }

    public EducationIntent classify(String question) {
        if (question == null || question.isBlank()) {
            return EducationIntent.OUT_OF_SCOPE;
        }
        String q = question.toLowerCase(Locale.ROOT);

        boolean looksLikeEstimate = ESTIMATE.matcher(q).find();
        boolean mentionsProcedure = PROCEDURE.matcher(q).find();
        boolean personal = PERSONAL.matcher(q).find();
        List<GlossaryTerm> glossaryMatches = glossary.findMatches(q);

        // 0) "How much of my annual maximum is left?" asks for the employee's balance, not a price.
        //    "How much" alone would otherwise send it to the estimate handoff below.
        if (personal && !mentionsProcedure && BALANCE.matcher(q).find()) {
            return EducationIntent.PERSONAL_PLAN_QUESTION;
        }

        // 1) Price/cost of a procedure -> estimate handoff (even if "my" appears).
        if (looksLikeEstimate && (mentionsProcedure || personal)) {
            return EducationIntent.ESTIMATE_REQUEST;
        }
        // A bare "how much will a crown cost" with a procedure but no cost verb edge case:
        if (mentionsProcedure && looksLikeEstimate) {
            return EducationIntent.ESTIMATE_REQUEST;
        }

        // 2) About the user's own plan amounts/benefits -> needs verified facts.
        if (personal && (PERSONAL_TOPIC.matcher(q).find() || !glossaryMatches.isEmpty())) {
            return EducationIntent.PERSONAL_PLAN_QUESTION;
        }

        // 3) A general concept we have a reviewed definition for.
        if (!glossaryMatches.isEmpty()) {
            return EducationIntent.GENERAL_DEFINITION;
        }

        // 4) Nothing matched.
        return EducationIntent.OUT_OF_SCOPE;
    }
}
