package com.codelinc.dental.service.education;

import com.codelinc.dental.dto.education.EducationChatResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Orchestrates a single benefits-EDUCATION turn:
 * <ol>
 *   <li>Deterministically route the question ({@link EducationIntentRouter}).</li>
 *   <li>Gather only approved glossary definitions and, for personal questions,
 *       VERIFIED facts from {@link PlanFactsProvider} (never fabricated).</li>
 *   <li>Build a safe deterministic answer that separates "general explanation"
 *       from "your plan".</li>
 *   <li>Optionally let the dedicated education model rewrite it in plainer
 *       language — but only when configured, and only if the rewrite does not
 *       introduce dollar amounts that aren't in the verified facts. Otherwise
 *       the deterministic answer stands.</li>
 * </ol>
 *
 * <p>This service does NOT compute costs, read repositories, or route through
 * the procedure-intent/estimate model. Estimate questions become a structured
 * handoff for Jay's flow.
 */
@Service
public class EducationChatService {

    private static final Logger log = LoggerFactory.getLogger(EducationChatService.class);

    /** Education-only system instructions (guardrails). */
    static final String SYSTEM_PROMPT = """
            You are a dental benefits EDUCATION assistant for employees. Your only job is to
            explain general dental-insurance concepts in plain, concise language, and to state
            an employee's own plan amounts ONLY when verified facts are provided to you.

            Rules you must follow:
            - Use ONLY the approved definitions and the verified plan facts given in the user
              message. Do not invent definitions, plan rules, coverage, or dollar amounts.
            - Clearly separate "In general" (the concept) from "Your plan" (verified facts).
            - Never promise coverage or payment. Amounts are estimates decided by the insurer.
            - A "copay" is a FIXED DOLLAR amount. "Coinsurance" is a PERCENTAGE. If the verified
              facts show coinsurance (a percentage) but the employee said "copay", gently
              correct the terminology.
            - If a specific plan amount is missing, say it is not available / cannot be verified
              yet. Do NOT guess or present example numbers as the employee's actual amounts.
            - Keep the answer short and free of unnecessary jargon. Do not add a question ID,
              preamble, or sign-off. Return only the answer text.
            """;

    // Any currency-looking token, used to guard the model from inventing amounts.
    private static final Pattern MONEY = Pattern.compile("\\$\\s?\\d[\\d,]*(?:\\.\\d+)?");

    private final EducationIntentRouter router;
    private final Glossary glossary;
    private final PlanFactsProvider planFactsProvider;
    private final EducationModelClient model;

    public EducationChatService(EducationIntentRouter router,
                                Glossary glossary,
                                PlanFactsProvider planFactsProvider,
                                EducationModelClient model) {
        this.router = router;
        this.glossary = glossary;
        this.planFactsProvider = planFactsProvider;
        this.model = model;
    }

    public EducationChatResponse answer(String question) {
        EducationIntent intent = router.classify(question);
        return switch (intent) {
            case ESTIMATE_REQUEST -> estimateHandoff(question);
            case OUT_OF_SCOPE -> outOfScope();
            case GENERAL_DEFINITION -> generalDefinition(question);
            case PERSONAL_PLAN_QUESTION -> personalPlan(question);
        };
    }

    // --- ESTIMATE: never compute; hand off to Jay's flow -----------------------

    private EducationChatResponse estimateHandoff(String question) {
        // If the question also names a concept, answer the definition briefly, then flag handoff.
        List<GlossaryTerm> matches = glossary.findMatches(question);
        StringBuilder sb = new StringBuilder();
        List<String> terms = new ArrayList<>();
        if (!matches.isEmpty()) {
            GlossaryTerm t = matches.get(0);
            terms.add(t.key());
            sb.append("In general: ").append(t.definition()).append(" ");
        }
        sb.append("For what a specific procedure would cost you, I can't calculate that here. "
                + "I'll hand this to the cost-estimate tool, which uses your plan's fees and coverage "
                + "to give you a figure. No price is shown here because it hasn't been calculated.");
        return new EducationChatResponse(
                EducationIntent.ESTIMATE_REQUEST,
                sb.toString().trim(),
                null,
                true,
                terms,
                false);
    }

    // --- OUT OF SCOPE ----------------------------------------------------------

    private EducationChatResponse outOfScope() {
        String msg = "I can help explain dental benefits terms — like deductible, copay, "
                + "coinsurance, annual maximum, and in- vs out-of-network — and, when your plan "
                + "details are available, what they mean for you. Try asking one of those.";
        return new EducationChatResponse(
                EducationIntent.OUT_OF_SCOPE, msg, null, false, List.of(), false);
    }

    // --- GENERAL DEFINITION: glossary only, no account data --------------------

    private EducationChatResponse generalDefinition(String question) {
        List<GlossaryTerm> matches = glossary.findMatches(question);
        List<String> terms = matches.stream().map(GlossaryTerm::key).toList();

        String deterministic = buildGeneralAnswer(matches);
        String userPrompt = "Question: " + question + "\n\n"
                + "Approved definitions you may use (do not add others):\n"
                + definitionsBlock(matches) + "\n"
                + "There are NO verified personal plan facts for this question. Explain the "
                + "concept(s) in general only.";

        Rewrite r = maybeRewrite(SYSTEM_PROMPT, userPrompt, deterministic, List.of());
        return new EducationChatResponse(
                EducationIntent.GENERAL_DEFINITION, r.text(), null, false, terms, r.modelUsed());
    }

    // --- PERSONAL PLAN: verified facts only ------------------------------------

    private EducationChatResponse personalPlan(String question) {
        List<GlossaryTerm> matches = glossary.findMatches(question);
        List<String> terms = matches.stream().map(GlossaryTerm::key).toList();
        Optional<PlanFacts> factsOpt = planFactsProvider.currentPlanFacts();

        if (factsOpt.isEmpty()) {
            // Transparent: give the general rule, say specific amounts are unavailable.
            String general = buildGeneralAnswer(matches);
            String msg = (general.isBlank() ? "" : general + " ")
                    + "I can't verify your specific plan amounts yet — that requires your "
                    + "authenticated plan details, which aren't connected here. Once they are, "
                    + "I can tell you your own numbers.";
            return new EducationChatResponse(
                    EducationIntent.PERSONAL_PLAN_QUESTION, msg.trim(), false, false, terms, false);
        }

        PlanFacts facts = factsOpt.get();
        String deterministic = buildPersonalAnswer(question, matches, facts);
        String userPrompt = "Question: " + question + "\n\n"
                + "Approved definitions you may use (do not add others):\n"
                + definitionsBlock(matches) + "\n\n"
                + "Verified plan facts (use ONLY these for 'Your plan'; do not add amounts):\n"
                + factsBlock(facts);

        Rewrite r = maybeRewrite(SYSTEM_PROMPT, userPrompt, deterministic, allowedAmounts(facts));
        return new EducationChatResponse(
                EducationIntent.PERSONAL_PLAN_QUESTION, r.text(), true, false, terms, r.modelUsed());
    }

    // --- deterministic answer builders -----------------------------------------

    private String buildGeneralAnswer(List<GlossaryTerm> matches) {
        if (matches.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder("In general: ");
        for (int i = 0; i < matches.size(); i++) {
            if (i > 0) {
                sb.append(' ');
            }
            sb.append(matches.get(i).definition());
        }
        return sb.toString();
    }

    private String buildPersonalAnswer(String question, List<GlossaryTerm> matches, PlanFacts facts) {
        StringBuilder sb = new StringBuilder();
        String general = buildGeneralAnswer(matches);
        if (!general.isBlank()) {
            sb.append(general).append("\n\n");
        }
        sb.append("Your plan: ");

        boolean asksCopay = question.toLowerCase().contains("copay")
                || question.toLowerCase().contains("co-pay");
        boolean asksNetwork = question.toLowerCase().contains("network");

        List<String> parts = new ArrayList<>();

        // Gently correct copay vs coinsurance if the user said "copay" but plan uses coinsurance.
        if (asksCopay && facts.usesInNetworkCoinsurance()) {
            parts.add("your plan uses coinsurance (a percentage), not a fixed-dollar copay, for this");
        }

        if (asksNetwork || facts.inNetworkCoinsurancePlanPays() != null
                || facts.outOfNetworkCoinsurancePlanPays() != null) {
            if (facts.inNetworkCoinsurancePlanPays() != null) {
                int plan = facts.inNetworkCoinsurancePlanPays();
                parts.add("in network, the plan pays " + plan + "% and you pay " + (100 - plan) + "%");
            } else if (facts.inNetworkCopay() != null) {
                parts.add("in network, your copay is " + money(facts.inNetworkCopay()));
            } else {
                parts.add("your in-network share isn't available");
            }

            if (facts.outOfNetworkCoinsurancePlanPays() != null) {
                int plan = facts.outOfNetworkCoinsurancePlanPays();
                parts.add("out of network, the plan pays " + plan + "% and you pay " + (100 - plan)
                        + "% (and an out-of-network dentist may bill you the difference above the allowed amount)");
            } else if (facts.outOfNetworkCopay() != null) {
                parts.add("out of network, your copay is " + money(facts.outOfNetworkCopay()));
            } else {
                parts.add("your out-of-network share isn't available");
            }
        }

        if (facts.remainingAnnualMaximum() != null) {
            parts.add("your remaining annual maximum is " + money(facts.remainingAnnualMaximum()));
        } else if (facts.annualMaximum() != null) {
            parts.add("your annual maximum is " + money(facts.annualMaximum()));
        }
        if (facts.deductibleRemaining() != null) {
            parts.add("your remaining deductible is " + money(facts.deductibleRemaining()));
        } else if (facts.deductible() != null) {
            parts.add("your deductible is " + money(facts.deductible()));
        }

        if (parts.isEmpty()) {
            sb.append("the specific amounts for this question aren't available, so I can't state your numbers.");
        } else {
            sb.append(String.join("; ", parts)).append('.');
        }
        sb.append(" These are what your plan reports; the insurer decides the final amount.");
        return sb.toString();
    }

    // --- model rewrite with an anti-fabrication guard --------------------------

    private record Rewrite(String text, boolean modelUsed) {
    }

    /**
     * Optionally rewrite the deterministic answer with the dedicated education
     * model. Falls back to {@code deterministic} when the model isn't available,
     * errors, returns blank, or introduces a dollar amount not in
     * {@code allowedAmounts}.
     */
    private Rewrite maybeRewrite(String systemPrompt, String userPrompt, String deterministic,
                                 List<String> allowedAmounts) {
        if (!model.isAvailable()) {
            return new Rewrite(deterministic, false);
        }
        try {
            String rewritten = model.rewrite(systemPrompt, userPrompt);
            if (rewritten == null || rewritten.isBlank()) {
                return new Rewrite(deterministic, false);
            }
            if (introducesUnsupportedAmount(rewritten, allowedAmounts)) {
                log.warn("Education model introduced an unsupported amount; using deterministic answer.");
                return new Rewrite(deterministic, false);
            }
            return new Rewrite(rewritten.trim(), true);
        } catch (RuntimeException e) {
            log.warn("Education model rewrite failed; using deterministic answer.", e);
            return new Rewrite(deterministic, false);
        }
    }

    /** True if the text contains a $ amount that isn't one of the verified amounts. */
    static boolean introducesUnsupportedAmount(String text, List<String> allowedAmounts) {
        Matcher m = MONEY.matcher(text);
        while (m.find()) {
            String found = normalizeMoney(m.group());
            boolean ok = allowedAmounts.stream().anyMatch(a -> normalizeMoney(a).equals(found));
            if (!ok) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeMoney(String raw) {
        String digits = raw.replaceAll("[^0-9.]", "");
        if (digits.endsWith(".00")) {
            digits = digits.substring(0, digits.length() - 3);
        }
        return digits;
    }

    private List<String> allowedAmounts(PlanFacts facts) {
        Set<String> amounts = new LinkedHashSet<>();
        addAmount(amounts, facts.annualMaximum());
        addAmount(amounts, facts.remainingAnnualMaximum());
        addAmount(amounts, facts.deductible());
        addAmount(amounts, facts.deductibleRemaining());
        addAmount(amounts, facts.inNetworkCopay());
        addAmount(amounts, facts.outOfNetworkCopay());
        return List.copyOf(amounts);
    }

    private void addAmount(Set<String> amounts, BigDecimal value) {
        if (value != null) {
            amounts.add(money(value));
        }
    }

    // --- prompt fragments ------------------------------------------------------

    private String definitionsBlock(List<GlossaryTerm> matches) {
        if (matches.isEmpty()) {
            return "(none)";
        }
        StringBuilder sb = new StringBuilder();
        for (GlossaryTerm t : matches) {
            sb.append("- ").append(t.term()).append(": ").append(t.definition()).append('\n');
        }
        return sb.toString().trim();
    }

    private String factsBlock(PlanFacts facts) {
        List<String> lines = new ArrayList<>();
        if (facts.planName() != null) {
            lines.add("- plan name: " + facts.planName());
        }
        if (facts.inNetworkCoinsurancePlanPays() != null) {
            lines.add("- in-network: plan pays " + facts.inNetworkCoinsurancePlanPays()
                    + "% (coinsurance, you pay the rest)");
        }
        if (facts.outOfNetworkCoinsurancePlanPays() != null) {
            lines.add("- out-of-network: plan pays " + facts.outOfNetworkCoinsurancePlanPays()
                    + "% (coinsurance, you pay the rest)");
        }
        if (facts.inNetworkCopay() != null) {
            lines.add("- in-network copay: " + money(facts.inNetworkCopay()) + " (fixed dollar)");
        }
        if (facts.outOfNetworkCopay() != null) {
            lines.add("- out-of-network copay: " + money(facts.outOfNetworkCopay()) + " (fixed dollar)");
        }
        if (facts.annualMaximum() != null) {
            lines.add("- annual maximum: " + money(facts.annualMaximum()));
        }
        if (facts.remainingAnnualMaximum() != null) {
            lines.add("- remaining annual maximum: " + money(facts.remainingAnnualMaximum()));
        }
        if (facts.deductible() != null) {
            lines.add("- deductible: " + money(facts.deductible()));
        }
        if (facts.deductibleRemaining() != null) {
            lines.add("- remaining deductible: " + money(facts.deductibleRemaining()));
        }
        return lines.isEmpty() ? "(no specific amounts verified)" : String.join("\n", lines);
    }

    private String money(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() <= 0) {
            return "$" + stripped.toBigInteger();
        }
        return "$" + stripped.toPlainString();
    }
}
