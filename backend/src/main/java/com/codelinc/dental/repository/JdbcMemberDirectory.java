package com.codelinc.dental.repository;

import com.codelinc.dental.dto.MemberSummary;
import com.codelinc.dental.dto.MemberSummary.CoverageRule;
import com.codelinc.dental.service.data.MemberDirectory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * {@link MemberDirectory} over Gopal's schema ({@code users}, {@code dental_plans},
 * {@code plan_coverage}, {@code benefit_usage}). Active only under the {@code db} profile, like
 * {@link JdbcDentalDataAccess}.
 *
 * <p>Reads only. Usage is summed per member for one benefit year, and "remaining" is the plain
 * {@code annual_maximum - used} reduction the database README allows in queries; all coverage math
 * stays in the calculator.
 */
@Repository
@Profile("db")
public class JdbcMemberDirectory implements MemberDirectory {

    static final String MEMBERS_SQL = """
            SELECT u.id,
                   u.full_name,
                   p.id   AS plan_id,
                   p.name AS plan_name,
                   p.annual_maximum,
                   p.deductible,
                   p.plan_year_start,
                   p.plan_year_end,
                   COALESCE(SUM(b.plan_paid), 0)                                  AS used,
                   GREATEST(p.annual_maximum - COALESCE(SUM(b.plan_paid), 0), 0)  AS remaining,
                   COALESCE(SUM(b.applied_to_deductible), 0)                      AS deductible_met
            FROM users u
            JOIN dental_plans p ON p.id = u.plan_id
            LEFT JOIN benefit_usage b ON b.user_id = u.id AND b.benefit_year = ?
            GROUP BY u.id, u.full_name, p.id, p.name, p.annual_maximum, p.deductible,
                     p.plan_year_start, p.plan_year_end
            ORDER BY u.full_name, u.id
            """;

    static final String COVERAGE_SQL = """
            SELECT plan_id, category, network_type, plan_pays_pct, deductible_applies
            FROM plan_coverage
            ORDER BY plan_id, category, network_type
            """;

    private final JdbcTemplate jdbc;

    public JdbcMemberDirectory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<MemberSummary> listMembers(int benefitYear) {
        Map<Long, List<CoverageRule>> coverageByPlan = new HashMap<>();
        jdbc.query(COVERAGE_SQL, (RowCallbackHandler) rs -> {
            coverageByPlan.computeIfAbsent(rs.getLong("plan_id"), id -> new ArrayList<>()).add(new CoverageRule(
                    rs.getString("category"),
                    rs.getString("network_type"),
                    rs.getBigDecimal("plan_pays_pct"),
                    rs.getBoolean("deductible_applies")));
        });

        return jdbc.query(MEMBERS_SQL, (rs, rowNum) -> new MemberSummary(
                String.valueOf(rs.getLong("id")),
                rs.getString("full_name"),
                rs.getString("plan_name"),
                rs.getBigDecimal("annual_maximum"),
                rs.getBigDecimal("deductible"),
                rs.getObject("plan_year_start", LocalDate.class),
                rs.getObject("plan_year_end", LocalDate.class),
                benefitYear,
                rs.getBigDecimal("used"),
                rs.getBigDecimal("remaining"),
                rs.getBigDecimal("deductible_met"),
                List.copyOf(coverageByPlan.getOrDefault(rs.getLong("plan_id"), List.of()))
        ), benefitYear);
    }
}
