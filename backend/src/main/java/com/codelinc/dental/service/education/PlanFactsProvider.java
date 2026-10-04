package com.codelinc.dental.service.education;

import java.util.Optional;

/**
 * Read-only source of VERIFIED plan facts for the authenticated employee.
 *
 * <p>This is the seam between the education chatbot (this branch) and Jay's
 * service layer. The chatbot depends only on this interface and never touches
 * JPA repositories, the schema, or estimate/calculation code. The implementation
 * is responsible for resolving the member from the project's authenticated user
 * context — the chatbot must not pass, and this method must not accept, a
 * user-supplied plan or account ID.
 *
 * <p>Until Jay's implementation exists, {@link UnavailablePlanFactsProvider}
 * returns {@link Optional#empty()}, and the chatbot responds transparently that
 * the employee's specific amounts cannot yet be verified.
 */
public interface PlanFactsProvider {

    /**
     * @return verified plan facts for the current authenticated employee, or
     *         {@link Optional#empty()} if no authenticated member context is
     *         available or facts could not be verified. Never fabricated.
     */
    Optional<PlanFacts> currentPlanFacts();
}
