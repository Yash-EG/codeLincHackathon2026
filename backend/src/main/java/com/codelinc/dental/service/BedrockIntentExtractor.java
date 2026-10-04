package com.codelinc.dental.service;

import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.DentalIntentType;
import com.codelinc.dental.intent.IntentExtractor;
import com.codelinc.dental.intent.ProcedureReference;
import com.codelinc.dental.service.prompt.IntentExtractionPrompt;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Bedrock-backed implementation of the backend's {@link IntentExtractor} port.
 *
 * <p>Builds the intent-extraction prompt, sends it through {@link StructuredAiService}
 * (Bedrock Converse with a system instruction), and parses the model's text into the
 * backend-owned {@link DentalIntent}. Parsing is tolerant: anything it cannot confidently
 * interpret becomes an {@link DentalIntentType#UNSUPPORTED} intent, never a fabricated
 * procedure — the orchestrator then asks the user to clarify. The intent is only a claim;
 * {@code AnalysisService} verifies every actionable part against trusted data.
 */
@Service
public class BedrockIntentExtractor implements IntentExtractor {

    private static final Logger log = LoggerFactory.getLogger(BedrockIntentExtractor.class);

    private final StructuredAiService ai;
    private final ObjectMapper mapper;

    public BedrockIntentExtractor(StructuredAiService ai, ObjectMapper mapper) {
        this.ai = ai;
        this.mapper = mapper;
    }

    @Override
    public DentalIntent interpret(String message) {
        String raw = ai.generateText(IntentExtractionPrompt.SYSTEM, IntentExtractionPrompt.user(message));
        return parse(raw);
    }

    private DentalIntent parse(String rawModelOutput) {
        try {
            String json = extractJsonObject(rawModelOutput);
            if (json == null) {
                return unsupported();
            }
            JsonNode root = mapper.readTree(json);
            if (!root.isObject()) {
                return unsupported();
            }

            DentalIntentType type = coerceType(text(root, "type"));
            ProcedureReference procedure = toProcedure(root.get("procedure"));
            String appointmentReference = normalizeAppointmentReference(text(root, "appointmentReference"));

            return new DentalIntent(type, procedure, appointmentReference);
        } catch (Exception e) {
            log.warn("Failed to parse intent JSON; returning UNSUPPORTED. Cause: {}", e.toString());
            return unsupported();
        }
    }

    private ProcedureReference toProcedure(JsonNode p) {
        if (p == null || !p.isObject()) {
            return null;
        }
        String spokenName = textOrNull(p, "spokenName");
        String cdtCodeHint = textOrNull(p, "cdtCodeHint");
        Integer toothNumber = null;
        JsonNode tooth = p.get("toothNumber");
        if (tooth != null && tooth.isInt()) {
            int t = tooth.asInt();
            if (t >= 1 && t <= 32) {
                toothNumber = t;
            }
        }
        if (spokenName == null && cdtCodeHint == null && toothNumber == null) {
            return null;
        }
        return new ProcedureReference(spokenName, cdtCodeHint, toothNumber);
    }

    private static String normalizeAppointmentReference(String value) {
        if (value == null) {
            return null;
        }
        return DentalIntent.RECOMMENDED.equalsIgnoreCase(value.trim())
                ? DentalIntent.RECOMMENDED
                : null;
    }

    private static DentalIntentType coerceType(String value) {
        if (value == null) {
            return DentalIntentType.UNSUPPORTED;
        }
        try {
            return DentalIntentType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return DentalIntentType.UNSUPPORTED;
        }
    }

    private static DentalIntent unsupported() {
        return new DentalIntent(DentalIntentType.UNSUPPORTED, null, null);
    }

    /** Extract the first balanced {@code { ... }} object, ignoring braces inside strings. */
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
        return null;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    private static String textOrNull(JsonNode node, String field) {
        String v = text(node, field);
        return (v == null || v.isBlank()) ? null : v;
    }
}
