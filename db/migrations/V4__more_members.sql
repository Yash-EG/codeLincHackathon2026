-- =============================================================================
-- V4__more_members.sql — more fictional employees for the Reception member list
-- =============================================================================
-- Adds a second plan (Demo PPO Plus) with its coverage rows, four more
-- fictional employees across both plans, and their 2026 benefit usage, so the
-- front desk has people to choose from and each one shows a different state:
-- untouched, partly used, deductible met, nearly at the annual maximum.
--
-- Everything is synthetic (example.com addresses, made-up names). Plan and user
-- ids are looked up by name/email, never hard-coded, because ids are IDENTITY.
--
-- Safe to run twice (these files are applied by hand with psql): every insert
-- skips rows that are already there, so a second run changes nothing. Without
-- that, a rerun that kept going past the first error would duplicate usage.
-- [PLACEHOLDER] dollar amounts follow the same placeholder rules as V2.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A richer plan: higher maximum, better basic and major coverage.
-- -----------------------------------------------------------------------------
INSERT INTO dental_plans
    (name, annual_maximum, deductible, plan_year_start, plan_year_end, major_waiting_period_months)
VALUES
    ('Demo PPO Plus', 2000.00, 50.00, '2026-01-01', '2026-12-31', 0)
ON CONFLICT (name) DO NOTHING;

-- In-network: preventive 100%, basic 90%, major 60%.
-- Out-of-network: preventive 80%, basic 70%, major 50%.
INSERT INTO plan_coverage
    (plan_id, category, network_type, plan_pays_pct, fee_multiplier, deductible_applies)
SELECT p.id, v.category, v.network_type, v.pct, 1.0000, v.deductible_applies
FROM dental_plans p
CROSS JOIN (
    VALUES
        ('PREVENTIVE', 'IN_NETWORK',     100.00, false),
        ('BASIC',      'IN_NETWORK',      90.00, true),
        ('MAJOR',      'IN_NETWORK',      60.00, true),
        ('PREVENTIVE', 'OUT_OF_NETWORK',  80.00, false),
        ('BASIC',      'OUT_OF_NETWORK',  70.00, true),
        ('MAJOR',      'OUT_OF_NETWORK',  50.00, true)
) AS v(category, network_type, pct, deductible_applies)
WHERE p.name = 'Demo PPO Plus'
ON CONFLICT (plan_id, category, network_type) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Employees.
-- -----------------------------------------------------------------------------
INSERT INTO users (email, full_name, plan_id)
SELECT v.email, v.full_name, p.id
FROM (
    VALUES
        ('maya.patel@example.com',   'Maya Patel',   'Demo PPO'),
        ('jordan.reyes@example.com', 'Jordan Reyes', 'Demo PPO Plus'),
        ('sam.okafor@example.com',   'Sam Okafor',   'Demo PPO'),
        ('lena.fischer@example.com', 'Lena Fischer', 'Demo PPO Plus')
) AS v(email, full_name, plan_name)
JOIN dental_plans p ON p.name = v.plan_name
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2026 usage. plan_paid follows each plan's coverage after the $50 deductible.
-- All visits are in-network: the analyzer's usage lookup (findBenefitUsage) sums
-- one network at a time, while queries.sql Q3/Q4 sum both, so out-of-network
-- usage would make the two disagree until that is settled.
--   Maya   (Demo PPO):      cleaning + filling                -> $285 used, deductible met
--   Jordan (Demo PPO Plus): exam, crown, root canal, filling  -> $1,710 used, deductible met
--   Sam    (Demo PPO):      nothing yet                       -> $0 used
--   Lena   (Demo PPO Plus): cleaning, X-ray, extraction       -> $349.50 used, deductible met
-- -----------------------------------------------------------------------------
INSERT INTO benefit_usage
    (user_id, procedure_id, benefit_year, service_date, network_type,
     billed_amount, plan_paid, patient_paid, applied_to_deductible)
SELECT u.id, pr.id, 2026, v.service_date::DATE, v.network_type,
       v.billed, v.plan_paid, v.patient_paid, v.deductible
FROM (
    VALUES
        ('maya.patel@example.com',   'Cleaning',   '2026-02-10', 'IN_NETWORK',      125.00,  125.00,   0.00,  0.00),
        ('maya.patel@example.com',   'Filling',    '2026-05-21', 'IN_NETWORK',      250.00,  160.00,  90.00, 50.00),
        ('jordan.reyes@example.com', 'Exam',       '2026-01-14', 'IN_NETWORK',       75.00,   75.00,   0.00,  0.00),
        ('jordan.reyes@example.com', 'Crown',      '2026-04-02', 'IN_NETWORK',     1400.00,  810.00, 590.00, 50.00),
        ('jordan.reyes@example.com', 'Root Canal', '2026-06-18', 'IN_NETWORK',     1000.00,  600.00, 400.00,  0.00),
        ('jordan.reyes@example.com', 'Filling',    '2026-08-05', 'IN_NETWORK',      250.00,  225.00,  25.00,  0.00),
        ('lena.fischer@example.com', 'Cleaning',   '2026-03-03', 'IN_NETWORK',      125.00,  125.00,   0.00,  0.00),
        ('lena.fischer@example.com', 'X-Ray',      '2026-03-03', 'IN_NETWORK',       85.00,   85.00,   0.00,  0.00),
        ('lena.fischer@example.com', 'Extraction', '2026-07-29', 'IN_NETWORK',      205.00,  139.50,  65.50, 50.00)
) AS v(email, procedure_name, service_date, network_type, billed, plan_paid, patient_paid, deductible)
JOIN users u ON u.email = v.email
JOIN procedures pr ON pr.name = v.procedure_name
-- benefit_usage has no natural key, so skip a visit that is already recorded.
WHERE NOT EXISTS (
    SELECT 1
    FROM benefit_usage x
    WHERE x.user_id = u.id
      AND x.procedure_id = pr.id
      AND x.service_date = v.service_date::DATE
);
