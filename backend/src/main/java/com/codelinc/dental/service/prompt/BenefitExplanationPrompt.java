package com.codelinc.dental.service.prompt;

import com.codelinc.dental.dto.BenefitEstimate;

import java.math.BigDecimal;

/**
 * Centralized prompt for narrating an authoritative {@link BenefitEstimate} in plain
 * language (Step 8).
 *
 * <p>The numbers are computed by the calculator and are authoritative. The system
 * instruction forbids changing, recalculating, or inventing any figure, forbids
 * guaranteeing coverage, and requires framing everything as an estimate based on the
 * supplied plan information. The user turn lists the exact numbers the model must use
 * verbatim.
 */
public final class BenefitExplanationPrompt {

    private BenefitExplanationPrompt() {
    }

    public static final String SYSTEM = """
            You explain a dental cost estimate to a patient in plain, friendly language.

            The numbers below were already calculated by a trusted system. Your job is ONLY
            to narrate them.

            Strict rules:
            - Use the supplied dollar amounts EXACTLY as given. Do NOT change, round, re-derive,
              add, or compute any number. Do not introduce any figure that is not provided.
            - Do NOT guarantee coverage or payment. Make clear these are ESTIMATES based on the
              plan information provided, and the final amount may differ.
            - Do NOT give dental or medical advice and do NOT tell the user what treatment to get.
            - Keep it to 2-4 short sentences, warm and jargon-free. Briefly explain why the
              patient pays what they pay (deductible, coinsurance, annual maximum) using only
              the supplied values.
            - Plain text only. No markdown, no bullet lists.
            """;

    /**
     * Build the user turn listing the authoritative numbers for one estimate.
     *
     * @param e the completed estimate to narrate
     * @return the user prompt
     */
    public static String user(BenefitEstimate e) {
        StringBuilder sb = new StringBuilder();
        sb.append("Explain this estimate using ONLY these values (verbatim):\n");
        sb.append("Procedure: ").append(nullSafe(e.procedureName()));
        if (e.cdtCode() != null) {
            sb.append(" (").append(e.cdtCode()).append(')');
        }
        sb.append('\n');
        if (e.toothNumber() != null) {
            sb.append("Tooth: #").append(e.toothNumber()).append('\n');
        }
        if (e.networkTier() != null) {
            sb.append("Network: ").append(e.networkTier()).append('\n');
        }
        money(sb, "Provider fee", e.fee());
        money(sb, "Plan-allowed amount", e.allowed());
        money(sb, "Plan pays", e.planPays());
        money(sb, "You pay", e.patientPays());
        money(sb, "Deductible applied", e.deductibleApplied());
        money(sb, "Amount over annual maximum", e.overMaximum());
        money(sb, "Remaining annual benefit", e.remainingBenefit());
        return sb.toString();
    }

    private static void money(StringBuilder sb, String label, BigDecimal value) {
        if (value != null) {
            sb.append(label).append(": $").append(value.toPlainString()).append('\n');
        }
    }

    private static String nullSafe(String s) {
        return s == null ? "(unspecified)" : s;
    }
}
