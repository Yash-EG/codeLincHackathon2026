package com.codelinc.dental.repository;

import com.codelinc.dental.intent.ProcedurePhrases;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.DentalDataAccess;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import com.codelinc.dental.service.data.ResolvedProcedure;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * JDBC adapter that implements {@link DentalDataAccess} over Gopal's Neon schema
 * ({@code db/migrations/V1..V3}). Active only under the {@code db} Spring profile, so the API still
 * boots without a database for early development; under {@code db} it satisfies the single
 * {@code DentalDataAccess} bean the orchestrator needs, letting the full context start end-to-end.
 *
 * <p>Design: thin {@link JdbcTemplate} reads, no entities, no benefit math. The database is the
 * source of trusted facts; {@code BenefitCalculatorService} does the math and the AI does none. The
 * SQL here only reads and aggregates (the deductible/maximum "remaining" sums are plain SQL
 * reductions over stored rows, not coverage decisions). Hibernate stays {@code ddl-auto=none}.
 *
 * <h2>Schema reconciliation decisions</h2>
 * <ul>
 *   <li><strong>No enrollment table.</strong> {@code enrollmentId} is the user id as a string, used
 *       consistently by {@link #findActivePlan} and {@link #findBenefitUsage} (usage keys on
 *       {@code user_id}).</li>
 *   <li><strong>No allowed-ratio column.</strong> This schema expresses the out-of-network penalty
 *       through a lower {@code plan_pays_pct}, not an allowed-amount haircut, so
 *       {@link PlanRules#oonAllowedRatio()} is a constant {@code 1.00} (the plan allows the full
 *       network fee). See the caveat note for Jay/Gopal.</li>
 *   <li><strong>No alias column.</strong> {@link #resolveProcedure} matches the canonical
 *       {@code procedures.name} case-insensitively, with a small in-code synonym map for everyday
 *       words ("cap" → "Crown").</li>
 *   <li><strong>Nullable {@code cdt_code}.</strong> All seeded procedures have one; coverage is
 *       resolved via the procedure's {@code category}, keyed from its {@code cdt_code}.</li>
 * </ul>
 */
@Repository
@Profile("db")
public class JdbcDentalDataAccess implements DentalDataAccess {

    /**
     * Out-of-network allowed ratio. This schema has no allowed-amount column; the out-of-network
     * difference is modeled entirely through {@code plan_coverage.plan_pays_pct}. So the plan allows
     * the full network fee (ratio 1.00) and the calculator's balance-billing term is zero here.
     */
    private static final BigDecimal OON_ALLOWED_RATIO = BigDecimal.ONE;

    /** Procedures that are billed per tooth and therefore need a tooth number to price. */
    private static final Set<String> TOOTH_SPECIFIC = Set.of(
            "Filling", "Crown", "Extraction", "Root Canal", "Implant");

    /** Every catalog procedure, for the forgiving second pass in {@link #resolveProcedure}. */
    private static final String ALL_PROCEDURES_SQL = """
            SELECT name, cdt_code
            FROM procedures
            ORDER BY name
            """;

    private final JdbcTemplate jdbc;

    public JdbcDentalDataAccess(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<PlanContext> findActivePlan(String userId) {
        Long uid = parseId(userId);
        if (uid == null) {
            return Optional.empty();
        }
        String sql = """
                SELECT p.id            AS plan_id,
                       p.name          AS plan_name,
                       p.plan_year_start,
                       p.plan_year_end
                FROM users u
                JOIN dental_plans p ON p.id = u.plan_id
                WHERE u.id = ?
                """;
        List<PlanContext> rows = jdbc.query(sql, (rs, i) -> new PlanContext(
                userId,                                   // enrollmentId == userId (no enrollment table)
                String.valueOf(rs.getLong("plan_id")),
                rs.getString("plan_name"),
                rs.getDate("plan_year_start").toLocalDate(),
                rs.getDate("plan_year_end").toLocalDate(),
                new PlanRules(OON_ALLOWED_RATIO)), uid);
        return rows.stream().findFirst();
    }

    @Override
    public ProcedureResolution resolveProcedure(String spokenName) {
        if (spokenName == null || spokenName.isBlank()) {
            return ProcedureResolution.unknown();
        }
        String term = spokenName.trim().toLowerCase(Locale.ROOT);
        // Everyday phrases ("cap", "checkup") map to canonical names; null when the term already is one.
        String canonical = ProcedurePhrases.canonical(term).orElse(null);

        // Match the canonical synonym exactly if we have one; otherwise case-insensitive on name.
        String sql = """
                SELECT name, cdt_code
                FROM procedures
                WHERE LOWER(name) = LOWER(?)
                ORDER BY name
                """;
        String lookup = canonical != null ? canonical : spokenName.trim();
        List<ResolvedProcedure> matches = jdbc.query(sql, PROCEDURE_MAPPER, lookup);

        if (matches.isEmpty()) {
            // Forgiving second pass: plurals, articles and longer phrasing ("two root canals",
            // "a porcelain crown", "wisdom tooth removal"). Only names in the catalog can match.
            Set<String> named = ProcedurePhrases.findIn(term);
            if (named.isEmpty()) {
                return ProcedureResolution.unknown();
            }
            matches = jdbc.query(ALL_PROCEDURES_SQL, PROCEDURE_MAPPER).stream()
                    .filter(p -> named.contains(p.canonicalName()))
                    .toList();
            if (matches.isEmpty()) {
                return ProcedureResolution.unknown();
            }
        }
        if (matches.size() == 1) {
            return ProcedureResolution.resolved(matches.get(0));
        }
        return ProcedureResolution.ambiguous(matches);
    }

    @Override
    public Optional<ProcedureCoverage> findCoverage(String planId, String cdtCode, NetworkTier networkTier) {
        Long pid = parseId(planId);
        if (pid == null || cdtCode == null) {
            return Optional.empty();
        }
        // Resolve the procedure's category + reference cost from its CDT code, then join the plan's
        // coverage row for that (category, network). unitFee = reference_cost * fee_multiplier.
        String sql = """
                SELECT pc.plan_pays_pct,
                       pc.deductible_applies,
                       (pr.reference_cost * pc.fee_multiplier) AS unit_fee
                FROM procedures pr
                JOIN plan_coverage pc
                  ON pc.category = pr.category
                 AND pc.plan_id = ?
                 AND pc.network_type = ?
                WHERE pr.cdt_code = ?
                """;
        List<ProcedureCoverage> rows = jdbc.query(sql, (rs, i) -> new ProcedureCoverage(
                cdtCode,
                networkTier,
                true, // a coverage row exists => covered
                rs.getBigDecimal("plan_pays_pct"),
                rs.getBoolean("deductible_applies"),
                rs.getBigDecimal("unit_fee")), pid, networkTier.name(), cdtCode);
        return rows.stream().findFirst();
    }

    @Override
    public Optional<BenefitUsage> findBenefitUsage(String enrollmentId, int benefitYear, NetworkTier networkTier) {
        Long uid = parseId(enrollmentId); // enrollmentId == userId
        if (uid == null) {
            return Optional.empty();
        }
        // Pull the plan's annual maximum + deductible, and the user's summed usage for this year.
        // Usage is summed across BOTH networks: the annual maximum and the deductible are one shared
        // pot per plan year (db/queries.sql Q3/Q4). Filtering by network made the out-of-network
        // estimate ignore everything already used in-network (full maximum, deductible not met).
        // The network only labels the snapshot. Remaining amounts are plain SQL reductions (floored
        // at zero), not benefit decisions.
        String sql = """
                SELECT p.annual_maximum,
                       p.deductible,
                       COALESCE(SUM(bu.plan_paid), 0)             AS used,
                       COALESCE(SUM(bu.applied_to_deductible), 0) AS ded_met
                FROM users u
                JOIN dental_plans p ON p.id = u.plan_id
                LEFT JOIN benefit_usage bu
                  ON bu.user_id = u.id
                 AND bu.benefit_year = ?
                WHERE u.id = ?
                GROUP BY p.annual_maximum, p.deductible
                """;
        List<BenefitUsage> rows = jdbc.query(sql, (rs, i) -> {
            BigDecimal annualMax = rs.getBigDecimal("annual_maximum");
            BigDecimal deductible = rs.getBigDecimal("deductible");
            BigDecimal used = rs.getBigDecimal("used");
            BigDecimal dedMet = rs.getBigDecimal("ded_met");
            BigDecimal remainingMax = annualMax.subtract(used).max(BigDecimal.ZERO);
            BigDecimal remainingDed = deductible.subtract(dedMet).max(BigDecimal.ZERO);
            return new BenefitUsage(networkTier, remainingDed, remainingMax);
        }, benefitYear, uid);
        return rows.stream().findFirst();
    }

    @Override
    public List<RecentAppointment> findRecentAppointments(String userId) {
        Long uid = parseId(userId);
        if (uid == null) {
            return List.of();
        }
        // One row per RECOMMENDED line item on the user's appointments, most recent first. Only
        // RECOMMENDED status counts as a dentist recommendation (PERFORMED/SCHEDULED do not).
        String sql = """
                SELECT a.id              AS appointment_id,
                       a.appointment_date,
                       pr.cdt_code       AS recommended_cdt,
                       ap.tooth_number   AS recommended_tooth
                FROM appointments a
                JOIN appointment_procedures ap ON ap.appointment_id = a.id
                JOIN procedures pr             ON pr.id = ap.procedure_id
                WHERE a.user_id = ?
                  AND ap.status = 'RECOMMENDED'
                ORDER BY a.appointment_date DESC, a.id DESC
                """;
        return jdbc.query(sql, (rs, i) -> {
            Integer tooth = rs.getObject("recommended_tooth") == null
                    ? null : rs.getInt("recommended_tooth");
            return new RecentAppointment(
                    String.valueOf(rs.getLong("appointment_id")),
                    rs.getDate("appointment_date").toLocalDate(),
                    rs.getString("recommended_cdt"),
                    tooth);
        }, uid);
    }

    // ---- helpers -------------------------------------------------------------------------------

    private static final RowMapper<ResolvedProcedure> PROCEDURE_MAPPER = (rs, i) -> {
        String name = rs.getString("name");
        return new ResolvedProcedure(
                rs.getString("cdt_code"), // nullable; carried through when present
                name,
                TOOTH_SPECIFIC.contains(name));
    };

    /** Parse a numeric BIGINT id from a string, returning null for non-numeric/blank input. */
    private static Long parseId(String id) {
        if (id == null || id.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(id.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
