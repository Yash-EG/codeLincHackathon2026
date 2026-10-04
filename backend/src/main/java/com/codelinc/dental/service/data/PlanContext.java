package com.codelinc.dental.service.data;

import com.codelinc.dental.service.calc.PlanRules;

import java.time.LocalDate;

/**
 * The user's active enrollment context: which plan, and the benefit-year window that defines the
 * "applicable year" for usage.
 *
 * <p>Backend-owned data-access port return type (fake-friendly). It mirrors the parts of
 * {@code plan_enrollments} / {@code insurance_plans} the orchestrator needs. The
 * {@code benefitYearStart}/{@code benefitYearEnd} come from the enrollment row, so the benefit year
 * is <strong>never hard-coded</strong>: the orchestrator derives the applicable year from these dates.
 *
 * @param enrollmentId     the active enrollment id
 * @param planId           the plan id
 * @param planName         human-readable plan name (for summaries)
 * @param benefitYearStart first day of the current benefit year (from the enrollment)
 * @param benefitYearEnd   last day of the current benefit year (from the enrollment)
 * @param planRules        static plan terms needed for pricing (e.g. out-of-network allowed ratio)
 */
public record PlanContext(
        String enrollmentId,
        String planId,
        String planName,
        LocalDate benefitYearStart,
        LocalDate benefitYearEnd,
        PlanRules planRules
) {
    /**
     * The calendar year the given date falls in within this benefit year. Derived, not assumed,
     * so callers never hard-code a year.
     */
    public int benefitYearOf(LocalDate date) {
        if (date.isBefore(benefitYearStart) || date.isAfter(benefitYearEnd)) {
            throw new IllegalArgumentException(
                    date + " is outside the benefit year " + benefitYearStart + ".." + benefitYearEnd);
        }
        return benefitYearStart.getYear();
    }
}
