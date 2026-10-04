package com.codelinc.dental.dto.education;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/education/chat}.
 *
 * <p>The chatbot never accepts plan terms, amounts or account facts from the client:
 * personal-plan figures are always loaded server-side by the
 * {@link com.codelinc.dental.service.education.PlanFactsProvider}. The optional
 * {@code memberId} only says <em>whose</em> plan to load: the employee checked in at
 * Reception, the same id {@code POST /api/analyze} takes as {@code userId}. Without it
 * the configured demo member is used, as before. (There is no authentication in this
 * demo; when it lands, the member should come from the security context instead.)
 *
 * @param message  the employee's question
 * @param memberId the checked-in employee's user id, or {@code null} for the demo member
 */
public record EducationChatRequest(
        @NotBlank(message = "message must not be blank")
        @Size(max = 2000, message = "message must be at most 2000 characters")
        String message,

        @Size(max = 64, message = "memberId must be at most 64 characters")
        String memberId
) {

    /** A question with no checked-in member: the demo member's plan is used. */
    public EducationChatRequest(String message) {
        this(message, null);
    }
}
