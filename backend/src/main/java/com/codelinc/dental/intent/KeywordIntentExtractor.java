package com.codelinc.dental.intent;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Reads a cost question without the AI: finds the catalog procedure it names
 * ({@link ProcedurePhrases}) and whether it says the dentist recommended it. Used when Bedrock is
 * unavailable, so estimates keep working instead of failing outright.
 *
 * <p>It never prices anything: like the AI path, it only says which procedure was asked about, and
 * {@code AnalysisService} still resolves that against the catalog and prices it from the database.
 * The tooth number is left to {@code AnalysisService}, which already reads "#19" or "tooth 19" from
 * the message.
 */
public final class KeywordIntentExtractor implements IntentExtractor {

    private static final Pattern RECOMMENDED = Pattern.compile(
            "\\brecommend(?:s|ed|ation)?\\b|\\b(?:dentist|doctor) (?:said|says|wants|told)\\b");

    @Override
    public DentalIntent interpret(String message) {
        // Only the question being asked, not the earlier conversation the frontend sends with it.
        String question = ConversationText.currentQuestion(message);
        Set<String> named = ProcedurePhrases.findIn(question);
        if (named.isEmpty()) {
            return new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
        }
        // One procedure per question, as on the AI path. If several are named, pass them all on so the
        // resolver asks which one rather than silently picking.
        String spoken = String.join(" or ", named);
        String appointment = RECOMMENDED.matcher(question.toLowerCase(Locale.ROOT)).find()
                ? DentalIntent.RECOMMENDED
                : null;
        return new DentalIntent(
                DentalIntentType.COST_ESTIMATE,
                new ProcedureReference(spoken, null, null),
                appointment);
    }
}
