package com.codelinc.dental.repository;

import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import com.codelinc.dental.service.data.PlanContext;
import com.codelinc.dental.service.data.ProcedureResolution;
import com.codelinc.dental.service.data.RecentAppointment;
import com.codelinc.dental.service.data.ResolvedProcedure;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Focused unit tests for {@link JdbcDentalDataAccess} using a mocked {@link JdbcTemplate}. These
 * verify the adapter's mapping logic (how it turns query results into the port's return types) and
 * its guards, without needing a live database. End-to-end SQL correctness against Gopal's schema is
 * covered by running the app under the {@code db} profile against Neon.
 */
class JdbcDentalDataAccessTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final JdbcDentalDataAccess data = new JdbcDentalDataAccess(jdbc);

    private static BigDecimal usd(String v) {
        return new BigDecimal(v);
    }

    @Test
    void findActivePlanMapsRowAndUsesUserIdAsEnrollmentId() {
        PlanContext mapped = new PlanContext(
                "1", "1", "Demo PPO",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
                new com.codelinc.dental.service.calc.PlanRules(BigDecimal.ONE));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(1L)))
                .thenReturn(List.of(mapped));

        Optional<PlanContext> result = data.findActivePlan("1");

        assertThat(result).isPresent();
        assertThat(result.get().enrollmentId()).isEqualTo("1"); // enrollmentId == userId
        assertThat(result.get().planName()).isEqualTo("Demo PPO");
    }

    @Test
    void findActivePlanReturnsEmptyForNonNumericUserId() {
        Optional<PlanContext> result = data.findActivePlan("not-a-number");
        assertThat(result).isEmpty(); // guarded before any query
    }

    @Test
    void resolveProcedureResolvesSingleMatch() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq("Crown")))
                .thenReturn(List.of(new ResolvedProcedure("D2740", "Crown", true)));

        // "cap" is a synonym for Crown; the adapter maps it before querying.
        ProcedureResolution res = data.resolveProcedure("cap");

        assertThat(res.outcome()).isEqualTo(ProcedureResolution.Outcome.RESOLVED);
        assertThat(res.procedure().canonicalName()).isEqualTo("Crown");
        assertThat(res.procedure().isToothSpecific()).isTrue();
    }

    @Test
    void resolveProcedureReturnsUnknownForNoMatch() {
        when(jdbc.query(anyString(), any(RowMapper.class), anyString()))
                .thenReturn(List.of());

        ProcedureResolution res = data.resolveProcedure("flux capacitor");

        assertThat(res.outcome()).isEqualTo(ProcedureResolution.Outcome.UNKNOWN);
    }

    @Test
    void resolveProcedureReturnsAmbiguousForMultipleMatches() {
        when(jdbc.query(anyString(), any(RowMapper.class), anyString()))
                .thenReturn(List.of(
                        new ResolvedProcedure("D2740", "Crown", true),
                        new ResolvedProcedure("D2750", "Crown (alt)", true)));

        ProcedureResolution res = data.resolveProcedure("crown");

        assertThat(res.outcome()).isEqualTo(ProcedureResolution.Outcome.AMBIGUOUS);
        assertThat(res.candidates()).hasSize(2);
    }

    @Test
    void resolveProcedureReturnsUnknownForBlankInput() {
        assertThat(data.resolveProcedure("  ").outcome())
                .isEqualTo(ProcedureResolution.Outcome.UNKNOWN);
    }

    @Test
    void findCoverageMapsRow() {
        ProcedureCoverage mapped = new ProcedureCoverage(
                "D2740", NetworkTier.IN_NETWORK, true, usd("50"), true, usd("1400.00"));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(1L), eq("IN_NETWORK"), eq("D2740")))
                .thenReturn(List.of(mapped));

        Optional<ProcedureCoverage> result = data.findCoverage("1", "D2740", NetworkTier.IN_NETWORK);

        assertThat(result).isPresent();
        assertThat(result.get().unitFee()).isEqualByComparingTo("1400.00");
        assertThat(result.get().covered()).isTrue();
    }

    @Test
    void findCoverageReturnsEmptyWhenNoRow() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(1L), eq("IN_NETWORK"), eq("D9999")))
                .thenReturn(List.of());

        assertThat(data.findCoverage("1", "D9999", NetworkTier.IN_NETWORK)).isEmpty();
    }

    @Test
    void findCoverageReturnsEmptyForNullCdtCode() {
        assertThat(data.findCoverage("1", null, NetworkTier.IN_NETWORK)).isEmpty();
    }

    @Test
    void findBenefitUsageMapsRemainingAmounts() {
        BenefitUsage mapped = new BenefitUsage(NetworkTier.IN_NETWORK, usd("0.00"), usd("600.00"));
        // Usage is one shared pot across networks, so the query takes only the year and the user.
        when(jdbc.query(anyString(), any(RowMapper.class), eq(2026), eq(1L)))
                .thenReturn(List.of(mapped));

        Optional<BenefitUsage> result = data.findBenefitUsage("1", 2026, NetworkTier.IN_NETWORK);

        assertThat(result).isPresent();
        assertThat(result.get().remainingAnnualMaximum()).isEqualByComparingTo("600.00");
        assertThat(result.get().remainingDeductible()).isEqualByComparingTo("0.00");
    }

    @Test
    void findRecentAppointmentsMapsRows() {
        RecentAppointment appt = new RecentAppointment(
                "10", LocalDate.of(2026, 9, 15), "D2740", 19);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(1L)))
                .thenReturn(List.of(appt));

        List<RecentAppointment> result = data.findRecentAppointments("1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).recommends("D2740")).isTrue();
        assertThat(result.get(0).recommendedTooth()).isEqualTo(19);
    }

    @Test
    void findRecentAppointmentsReturnsEmptyListForNonNumericUser() {
        assertThat(data.findRecentAppointments("bogus")).isEmpty();
    }
}
