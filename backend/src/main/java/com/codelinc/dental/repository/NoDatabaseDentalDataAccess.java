package com.codelinc.dental.repository;

import com.codelinc.dental.exception.DatabaseUnavailableException;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Stands in for {@link JdbcDentalDataAccess} when the backend runs without the {@code db} profile.
 *
 * <p>Without it, {@code AnalysisService} has no {@link DentalDataAccess} to inject and the whole
 * application fails to start, taking health and the education chat down with it. With it, the app
 * starts, and anything that needs plan data answers 503 with a message saying how to enable it.
 * It never returns made-up data.
 */
@Repository
@Profile("!db")
public class NoDatabaseDentalDataAccess implements DentalDataAccess {

    static final String MESSAGE =
            "Cost estimates need the database. Start the backend with the db profile "
                    + "(SPRING_PROFILES_ACTIVE=db) and the DATABASE_* variables set.";

    private static DatabaseUnavailableException unavailable() {
        return new DatabaseUnavailableException(MESSAGE);
    }

    @Override
    public Optional<PlanContext> findActivePlan(String userId) {
        throw unavailable();
    }

    @Override
    public ProcedureResolution resolveProcedure(String spokenName) {
        throw unavailable();
    }

    @Override
    public Optional<ProcedureCoverage> findCoverage(String planId, String cdtCode, NetworkTier networkTier) {
        throw unavailable();
    }

    @Override
    public Optional<BenefitUsage> findBenefitUsage(String enrollmentId, int benefitYear, NetworkTier networkTier) {
        throw unavailable();
    }

    @Override
    public List<RecentAppointment> findRecentAppointments(String userId) {
        throw unavailable();
    }
}
