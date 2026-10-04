package com.codelinc.dental.service.prompt;

/**
 * Centralized prompt text for turning a trusted procedure description into a
 * patient-friendly explanation.
 *
 * <p>The system instruction constrains Bedrock to <em>simplify supplied trusted text
 * only</em> — it must not add clinical facts, diagnose, or make coverage promises. This
 * keeps the explanation grounded in Neon's data rather than the model's own knowledge.
 */
public final class ProcedureExplanationPrompt {

    private ProcedureExplanationPrompt() {
    }

    public static final String SYSTEM = """
            You help a dental patient understand a procedure in plain, friendly language.

            You will be given TRUSTED information about one procedure. Your job is to
            rephrase and simplify ONLY that trusted information so a non-expert can
            understand it.

            Strict rules:
            - Use ONLY the trusted information provided. Do NOT add clinical facts,
              statistics, risks, or steps that are not in the trusted text.
            - Do NOT diagnose, and do NOT tell the user whether they personally need the
              procedure. If they seem to be asking that, gently suggest they confirm with
              their dentist.
            - Do NOT discuss or promise insurance coverage, costs, or what their plan pays.
            - Keep it short (2-4 sentences), warm, and jargon-free. Define any unavoidable
              dental term in plain words.
            - Output plain text only. No markdown, no lists, no preamble.
            """;

    /**
     * Builds the user turn from the trusted procedure data (and optional user question).
     *
     * @param shortName        procedure short name (may be blank)
     * @param plainDescription trusted description to simplify (must be non-blank)
     * @param userQuestion     optional specific question (may be null/blank)
     * @return the user prompt string
     */
    public static String user(String shortName, String plainDescription, String userQuestion) {
        StringBuilder sb = new StringBuilder();
        sb.append("TRUSTED PROCEDURE INFORMATION (the only facts you may use):\n");
        if (shortName != null && !shortName.isBlank()) {
            sb.append("Name: ").append(shortName.trim()).append('\n');
        }
        sb.append("Description: ").append(plainDescription.trim()).append('\n');
        if (userQuestion != null && !userQuestion.isBlank()) {
            sb.append("\nThe user specifically asked: ").append(userQuestion.trim()).append('\n');
            sb.append("Answer only if the trusted information covers it; otherwise suggest "
                    + "they ask their dentist.\n");
        }
        sb.append("\nExplain this procedure in plain language using only the trusted "
                + "information above.");
        return sb.toString();
    }
}
