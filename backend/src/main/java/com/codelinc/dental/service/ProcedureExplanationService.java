package com.codelinc.dental.service;

import com.codelinc.dental.dto.ProcedureExplanationRequest;
import com.codelinc.dental.dto.ProcedureExplanationResponse;

/**
 * Turns trusted procedure information (from Neon, supplied by Jay/Gopal) into a
 * patient-friendly explanation.
 *
 * <p>Grounding contract: the explanation is derived only from the supplied
 * {@code plainDescription}. When no trusted description is available, the implementation
 * must refuse to invent clinical facts and instead return a safe, non-authoritative
 * response with {@code groundedOnTrustedInfo = false}.
 */
public interface ProcedureExplanationService {

    /**
     * @param request trusted procedure info plus an optional user question
     * @return a plain-language explanation; never {@code null}
     */
    ProcedureExplanationResponse explain(ProcedureExplanationRequest request);
}
