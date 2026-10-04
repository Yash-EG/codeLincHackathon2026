package com.codelinc.dental.service.data;

import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.ProcedureCoverage;

import java.util.List;
import java.util.Optional;

/**
 * Backend-owned port for the trusted data the orchestrator needs. The real implementation (Gopal's
 * repositories over Neon) is provided later; tests use an in-memory fake. {@code AnalysisService}
 * depends only on this interface, never on JPA or SQL.
 *
 * <p>Every method returns <em>trusted</em> data. The orchestrator uses these results — not the AI's
 * claims — as the basis for pricing, coverage and recommendation decisions.
 *
 * <p><strong>Contract note (Phase 6):</strong> these signatures express what the orchestration needs.
 * When the real repositories land we reconcile names/types; the orchestrator should keep depending on
 * an interface of roughly this shape rather than on repository internals.
 */
public interface DentalDataAccess {

    /**
     * Find the user's active enrollment/plan context, including the benefit-year window used to
     * derive the applicable year (so the year is never hard-coded).
     *
     * @param userId the user id
     * @return the active plan context, or empty if the user has no active enrollment
     */
    Optional<PlanContext> findActivePlan(String userId);

    /**
     * Resolve a spoken procedure term (e.g. "crown", "cap") against trusted catalog data.
     *
     * @param spokenName the everyday term the user used
     * @return a resolution that is RESOLVED, UNKNOWN, or AMBIGUOUS
     */
    ProcedureResolution resolveProcedure(String spokenName);

    /**
     * Find how a plan covers a trusted procedure under one network (coinsurance, deductible rule,
     * covered flag, per-unit fee), as a pricing-ready {@link ProcedureCoverage}.
     *
     * @param planId      the plan id
     * @param cdtCode     the trusted CDT code
     * @param networkTier the network to resolve coverage for
     * @return the coverage, or empty if the plan has no fee/coverage row for this procedure/network
     */
    Optional<ProcedureCoverage> findCoverage(String planId, String cdtCode, NetworkTier networkTier);

    /**
     * Find the remaining-benefit snapshot for an enrollment, scoped to a specific benefit year and
     * network. The {@code benefitYear} is supplied by the caller (derived from the plan context), not
     * assumed by the data layer.
     *
     * @param enrollmentId the enrollment id
     * @param benefitYear  the applicable benefit year
     * @param networkTier  the network to snapshot
     * @return the usage snapshot, or empty if none can be produced for that year/network
     */
    Optional<BenefitUsage> findBenefitUsage(String enrollmentId, int benefitYear, NetworkTier networkTier);

    /**
     * Find the user's recent appointments, most recent first, used to verify recommendations.
     *
     * @param userId the user id
     * @return recent appointments (possibly empty)
     */
    List<RecentAppointment> findRecentAppointments(String userId);
}
