package com.codelinc.dental.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * One employee in the member list ({@code GET /api/members}), for the Reception check-in.
 *
 * <p>Every value is a stored fact or a plain SQL reduction over stored rows (sums of usage, and
 * {@code annual maximum - used}); no coverage decision is made here. Email is deliberately left
 * out: the front desk picks people by name and plan.
 *
 * @param id               user id, the same id {@code POST /api/analyze} takes as {@code userId}
 * @param fullName         the employee's name
 * @param planName         their dental plan
 * @param annualMaximum    the plan's annual maximum
 * @param deductible       the plan's individual deductible
 * @param planYearStart    first day of the plan year
 * @param planYearEnd      last day of the plan year
 * @param benefitYear      the benefit year the usage figures are for
 * @param usedThisYear     what the plan has paid this benefit year (counts against the maximum)
 * @param remainingMaximum {@code max(annualMaximum - usedThisYear, 0)}
 * @param deductibleMet    how much of the deductible has been satisfied this benefit year
 * @param coverage         the plan's coverage rules, one per category and network
 */
public record MemberSummary(
        String id,
        String fullName,
        String planName,
        BigDecimal annualMaximum,
        BigDecimal deductible,
        LocalDate planYearStart,
        LocalDate planYearEnd,
        int benefitYear,
        BigDecimal usedThisYear,
        BigDecimal remainingMaximum,
        BigDecimal deductibleMet,
        List<CoverageRule> coverage
) {

    /**
     * One {@code plan_coverage} row.
     *
     * @param category          {@code PREVENTIVE}, {@code BASIC} or {@code MAJOR}
     * @param networkType       {@code IN_NETWORK} or {@code OUT_OF_NETWORK}
     * @param planPaysPct       the share the plan pays, 0 to 100
     * @param deductibleApplies whether the deductible applies first
     */
    public record CoverageRule(
            String category,
            String networkType,
            BigDecimal planPaysPct,
            boolean deductibleApplies
    ) {
    }
}
