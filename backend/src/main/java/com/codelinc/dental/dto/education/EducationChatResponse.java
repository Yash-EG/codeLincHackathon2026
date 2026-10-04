package com.codelinc.dental.dto.education;

import com.codelinc.dental.service.education.EducationIntent;

import java.util.List;

/**
 * Response body for {@code POST /api/education/chat}.
 *
 * <p>Designed so the UI (eventually the Imaging / "Decode your plan" tab) can
 * tell these cases apart without parsing prose:
 * <ul>
 *   <li>{@code intent} — how the question was classified.</li>
 *   <li>{@code answer} — the plain-language text to show.</li>
 *   <li>{@code personalPlanDataAvailable} — false when a personal-plan question
 *       could not be backed by verified facts (show the "amounts unavailable"
 *       state); true when verified facts were used; null for non-personal
 *       questions.</li>
 *   <li>{@code estimateHandoff} — true when the UI should route the user to
 *       Jay's procedure-estimate flow.</li>
 *   <li>{@code termsUsed} — glossary keys whose approved definitions informed
 *       the answer (for display / debugging).</li>
 *   <li>{@code modelUsed} — whether the dedicated education model rewrote the
 *       answer, or it came from the deterministic fallback.</li>
 * </ul>
 */
public record EducationChatResponse(
        EducationIntent intent,
        String answer,
        Boolean personalPlanDataAvailable,
        boolean estimateHandoff,
        List<String> termsUsed,
        boolean modelUsed
) {
}
