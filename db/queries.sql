-- =============================================================================
-- codeLinc 11 — Dental Benefits Optimizer
-- Verification queries: one per question the database must answer.
--
-- Run against a database that has V1 + V2 + V3 applied. All examples use
-- demo user 1 / Demo PPO. Reminder: these queries only RETRIEVE trusted facts
-- and derive simple values (remaining = max - used, met = sum >= deductible).
-- All benefit MATH (coverage %, deductible application, annual-max cap) is
-- Jay's Java calculator, not the database.
--
-- Usage:
--   psql "<neon-connection-string>" -f db/queries.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Q1. What dental plan does this user have?
--     Repo: findPlanForUser(userId)
-- -----------------------------------------------------------------------------
SELECT dp.*
FROM users u
JOIN dental_plans dp ON dp.id = u.plan_id
WHERE u.id = 1;

-- -----------------------------------------------------------------------------
-- Q2. What is their annual maximum?
--     (Part of findPlanForUser; shown explicitly here.)
-- -----------------------------------------------------------------------------
SELECT dp.annual_maximum
FROM users u
JOIN dental_plans dp ON dp.id = u.plan_id
WHERE u.id = 1;

-- -----------------------------------------------------------------------------
-- Q3. Have they met their deductible?  (derived, no math stored)
--     deductible_met = SUM(applied_to_deductible) for the year.
--     is_deductible_met = deductible_met >= plan deductible.
--     Repo: findBenefitUsage(userId, year) + findPlanForUser(userId)
-- -----------------------------------------------------------------------------
SELECT
    dp.deductible                                         AS plan_deductible,
    COALESCE(SUM(bu.applied_to_deductible), 0)            AS deductible_met,
    COALESCE(SUM(bu.applied_to_deductible), 0) >= dp.deductible
                                                          AS is_deductible_met
FROM users u
JOIN dental_plans dp ON dp.id = u.plan_id
LEFT JOIN benefit_usage bu
       ON bu.user_id = u.id AND bu.benefit_year = 2026
WHERE u.id = 1
GROUP BY dp.deductible;

-- -----------------------------------------------------------------------------
-- Q4. How much of their annual benefit have they already used?  (derived)
--     used = SUM(plan_paid); remaining = annual_maximum - used.
--     Repo: findBenefitUsage(userId, year) + findPlanForUser(userId)
-- -----------------------------------------------------------------------------
SELECT
    dp.annual_maximum,
    COALESCE(SUM(bu.plan_paid), 0)                         AS annual_benefit_used,
    dp.annual_maximum - COALESCE(SUM(bu.plan_paid), 0)     AS annual_benefit_remaining
FROM users u
JOIN dental_plans dp ON dp.id = u.plan_id
LEFT JOIN benefit_usage bu
       ON bu.user_id = u.id AND bu.benefit_year = 2026
WHERE u.id = 1
GROUP BY dp.annual_maximum;

-- -----------------------------------------------------------------------------
-- Q5. What category is a crown?
--     Repo: findProcedureByName(name)
-- -----------------------------------------------------------------------------
SELECT name, category, cdt_code
FROM procedures
WHERE name = 'Crown';

-- -----------------------------------------------------------------------------
-- Q6. What is the plan's IN-NETWORK coverage for MAJOR procedures?
--     Repo: findCoverage(planId, 'MAJOR', 'IN_NETWORK')
-- -----------------------------------------------------------------------------
SELECT category, network_type, plan_pays_pct, fee_multiplier, deductible_applies
FROM plan_coverage
WHERE plan_id = 1 AND category = 'MAJOR' AND network_type = 'IN_NETWORK';

-- -----------------------------------------------------------------------------
-- Q7. What is the OUT-OF-NETWORK coverage? (shown for MAJOR to compare with Q6)
--     Repo: findCoverage(planId, 'MAJOR', 'OUT_OF_NETWORK')
-- -----------------------------------------------------------------------------
SELECT category, network_type, plan_pays_pct, fee_multiplier, deductible_applies
FROM plan_coverage
WHERE plan_id = 1 AND category = 'MAJOR' AND network_type = 'OUT_OF_NETWORK';

-- -----------------------------------------------------------------------------
-- Q8. What procedures were recommended at their last appointment?
--     "Last appointment" = most recent appointment_date for the user.
--     Repo: findRecentAppointments(userId)
-- -----------------------------------------------------------------------------
SELECT
    a.appointment_date,
    p.name            AS procedure_name,
    p.category,
    ap.status,
    ap.urgency,
    ap.tooth_number
FROM appointments a
JOIN appointment_procedures ap ON ap.appointment_id = a.id
JOIN procedures p              ON p.id = ap.procedure_id
WHERE a.user_id = 1
  AND a.appointment_date = (
        SELECT MAX(appointment_date) FROM appointments WHERE user_id = 1
      )
  AND ap.status = 'RECOMMENDED'
ORDER BY ap.urgency, p.name;

-- -----------------------------------------------------------------------------
-- Q9. What is the trusted description of a root canal?
--     Repo: findProcedureByName(name)
-- -----------------------------------------------------------------------------
SELECT name, plain_description, source
FROM procedures
WHERE name = 'Root Canal';
