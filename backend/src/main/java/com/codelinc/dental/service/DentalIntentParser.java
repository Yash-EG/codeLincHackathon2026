package com.codelinc.dental.service;

import com.codelinc.dental.dto.Confidence;
import com.codelinc.dental.dto.DentalIntent;
import com.codelinc.dental.dto.IntentType;
import com.codelinc.dental.dto.NetworkPreference;
import com.codelinc.dental.dto.ProcedureRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses the model's raw text output into a {@link DentalIntent}.
 *
 * <p>Deliberately tolerant: models sometimes wrap JSON in prose or code fences, use the
 * wrong case for enums, or omit fields. This parser extracts the first JSON object it can
 * find, coerces enums case-insensitively, applies sensible defaults, and — on any failure
 * — returns a safe {@code UNKNOWN} intent that asks the user to clarify rather than
 * throwing. {@code rawUserText} is always echoed from the original user message.
 */
public class DentalIntentParser {

    private static final Logger log = LoggerFactory.getLogger(DentalIntentParser.class);

    private final ObjectMapper mapper;

    public DentalIntentParser(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /**
     * @param rawModelOutput the model's raw text response
     * @param rawUserText    the original user message (echoed into the result)
     * @return a populated {@link DentalIntent}; never {@code null}
     */
    public DentalIntent parse(String rawModelOutput, String rawUserText) {
        try {
            String json = extractJsonObject(rawModelOutput);
            if (json == null) {
                return fallback(rawUserText, "Model did not return a JSON object.");
            }
            JsonNode root = mapper.readTree(json);
            if (!root.isObject()) {
                return fallback(rawUserText, "Model output was not a JSON object.");
            }
            return fromJson(root, rawUserText);
        } catch (Exception e) {
            log.warn("Failed to parse intent JSON; falling back to UNKNOWN. Cause: {}", e.toString());
            return fallback(rawUserText, "Model output could not be parsed.");
        }
    }

    private DentalIntent fromJson(JsonNode root, String rawUserText) {
        IntentType intent = coerceIntent(text(root, "intent"));
        NetworkPreference network = coerceNetwork(text(root, "networkPreference"));
        Confidence confidence = coerceConfidence(text(root, "confidence"));

        List<ProcedureRequest> procedures = new ArrayList<>();
        JsonNode procs = root.get("procedures");
        if (procs != null && procs.isArray()) {
            for (JsonNode p : procs) {
                procedures.add(toProcedure(p));
            }
        }

        String appointmentReference = textOrNull(root, "appointmentReference");
        String timing = textOrNull(root, "timing");
        String quotedCost = textOrNull(root, "quotedCost");
        String clarificationQuestion = textOrNull(root, "clarificationQuestion");

        boolean needsClarification = root.path("needsClarification").asBoolean(false);

        // Safety nets: an UNKNOWN result, or a LOW-confidence result, should always
        // surface a clarification prompt so the caller never proceeds on a guess.
        if (intent == IntentType.UNKNOWN || confidence == Confidence.LOW) {
            needsClarification = true;
            if (clarificationQuestion == null || clarificationQuestion.isBlank()) {
                clarificationQuestion =
                        "Could you tell me a bit more about what you'd like help with?";
            }
        }

        // MEDICAL_HELP is a deliberate route, not a clarification case.
        if (intent == IntentType.MEDICAL_HELP) {
            needsClarification = false;
            clarificationQuestion = null;
        }

        return new DentalIntent(
                intent,
                procedures,
                network,
                appointmentReference,
                timing,
                quotedCost,
                needsClarification,
                clarificationQuestion,
                confidence,
                rawUserText);
    }

    private ProcedureRequest toProcedure(JsonNode p) {
        if (p == null || !p.isObject()) {
            return new ProcedureRequest(null, null, 1, null);
        }
        String nameHint = textOrNull(p, "nameHint");
        String normalizedName = textOrNull(p, "normalizedName");
        if (normalizedName != null) {
            normalizedName = normalizedName.toLowerCase().trim();
        }
        int quantity = p.path("quantity").asInt(1);
        if (quantity < 1) {
            quantity = 1;
        }
        Integer toothNumber = null;
        JsonNode tooth = p.get("toothNumber");
        if (tooth != null && tooth.isInt()) {
            int t = tooth.asInt();
            if (t >= 1 && t <= 32) {
                toothNumber = t;
            }
        }
        return new ProcedureRequest(nameHint, normalizedName, quantity, toothNumber);
    }

    /**
     * Extracts the first balanced {@code { ... }} JSON object from arbitrary text,
     * ignoring braces inside strings. Handles code fences and surrounding prose.
     */
    private String extractJsonObject(String raw) {
        if (raw == null) {
            return null;
        }
        int start = raw.indexOf('{');
        if (start < 0) {
            return null;
        }
        boolean inString = false;
        boolean escaped = false;
        int depth = 0;
        for (int i = start; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) {
                    return raw.substring(start, i + 1);
                }
            }
        }
        return null; // unbalanced
    }

    private static IntentType coerceIntent(String value) {
        if (value == null) {
            return IntentType.UNKNOWN;
        }
        try {
            return IntentType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return IntentType.UNKNOWN;
        }
    }

    private static NetworkPreference coerceNetwork(String value) {
        if (value == null) {
            return NetworkPreference.UNSPECIFIED;
        }
        try {
            return NetworkPreference.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return NetworkPreference.UNSPECIFIED;
        }
    }

    private static Confidence coerceConfidence(String value) {
        if (value == null) {
            return Confidence.LOW;
        }
        try {
            return Confidence.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return Confidence.LOW;
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    private static String textOrNull(JsonNode node, String field) {
        String v = text(node, field);
        return (v == null || v.isBlank()) ? null : v;
    }

    private DentalIntent fallback(String rawUserText, String reason) {
        log.debug("Intent fallback to UNKNOWN: {}", reason);
        return new DentalIntent(
                IntentType.UNKNOWN,
                List.of(),
                NetworkPreference.UNSPECIFIED,
                null,
                null,
                null,
                true,
                "I didn't quite catch that — could you rephrase what you'd like help with?",
                Confidence.LOW,
                rawUserText);
    }
}
