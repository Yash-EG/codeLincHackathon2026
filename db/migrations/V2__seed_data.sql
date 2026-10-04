-- =============================================================================
-- codeLinc 11 — Dental Benefits Optimizer
-- V2: Seed / demo data (Neon / PostgreSQL)
--
-- All people below are fictional. Do NOT treat any value here as real member
-- data. Numbers marked [PLACEHOLDER] are illustrative and must be verified
-- against the Lincoln dental reference site and/or the FAIR Health cost
-- estimator before the demo. The SCHEMA and relationships are final; only the
-- magnitudes are placeholders.
--
-- Identity columns (GENERATED ALWAYS) assign ids 1,2,3... in insert order on a
-- fresh database, so "demo user 1" = the first user inserted = id 1, enrolled
-- in the first plan inserted = Demo PPO = id 1.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dental_plans — insert FIRST so user.plan_id can reference it.
--   Demo PPO: annual maximum $1,500, deductible $50, calendar-year 2026.
--   major_waiting_period_months: 0 for the demo so the crown scenario isn't
--   blocked by a waiting period.
-- -----------------------------------------------------------------------------
-- [PLACEHOLDER] annual_maximum 1500.00  — verify typical PPO annual max.
-- [PLACEHOLDER] deductible       50.00  — verify typical individual deductible.
INSERT INTO dental_plans
    (name, annual_maximum, deductible, plan_year_start, plan_year_end, major_waiting_period_months)
VALUES
    ('Demo PPO', 1500.00, 50.00, '2026-01-01', '2026-12-31', 0);

-- -----------------------------------------------------------------------------
-- users — "demo user 1" is the first row (id 1), enrolled in Demo PPO (id 1).
-- -----------------------------------------------------------------------------
INSERT INTO users (email, full_name, plan_id) VALUES
    ('demo.user@example.com', 'Demo User', 1);

-- -----------------------------------------------------------------------------
-- plan_coverage — ROW per (plan, category, network).
--   In-network:  preventive 100%, basic 80%, major 50%.
--   Out-of-network: preventive 80%, basic 60%, major 40%.
--   fee_multiplier default 1.00 everywhere for the demo; raise the OON
--   multiplier later if OON billed charges should exceed the reference cost.
--   deductible_applies: false for preventive, true for basic/major (typical).
-- -----------------------------------------------------------------------------
-- [PLACEHOLDER] all plan_pays_pct values — verify against Lincoln reference.
INSERT INTO plan_coverage
    (plan_id, category, network_type, plan_pays_pct, fee_multiplier, deductible_applies)
VALUES
    (1, 'PREVENTIVE', 'IN_NETWORK',      100.00, 1.0000, false),
    (1, 'BASIC',      'IN_NETWORK',       80.00, 1.0000, true),
    (1, 'MAJOR',      'IN_NETWORK',       50.00, 1.0000, true),
    (1, 'PREVENTIVE', 'OUT_OF_NETWORK',   80.00, 1.0000, false),
    (1, 'BASIC',      'OUT_OF_NETWORK',   60.00, 1.0000, true),
    (1, 'MAJOR',      'OUT_OF_NETWORK',   40.00, 1.0000, true);

-- -----------------------------------------------------------------------------
-- procedures — canonical catalog. Names match the agreed set EXACTLY:
--   Exam, X-Ray, Cleaning, Filling, Extraction, Deep Cleaning,
--   Root Canal, Crown, Implant.
-- reference_cost is the pre-multiplier cost basis.
-- plain_description is trusted text the AI reads verbatim.
-- -----------------------------------------------------------------------------
-- [PLACEHOLDER] every reference_cost below — verify against FAIR Health.
-- [PLACEHOLDER] plain_description wording — confirm against Lincoln reference.
INSERT INTO procedures (name, cdt_code, category, reference_cost, plain_description, source) VALUES
    ('Exam',          'D0120', 'PREVENTIVE',   75.00,
        'A routine check-up where the dentist looks at your teeth and gums for problems.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('X-Ray',         'D0274', 'PREVENTIVE',   85.00,
        'Images of your teeth that help the dentist find cavities and issues not visible by eye.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Cleaning',      'D1110', 'PREVENTIVE',  125.00,
        'A standard professional cleaning that removes plaque and tartar from your teeth.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Filling',       'D2391', 'BASIC',       250.00,
        'A repair that fills in a cavity to restore a tooth damaged by decay.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Extraction',    'D7140', 'BASIC',       205.00,
        'Removal of a tooth that is too damaged or decayed to save.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Deep Cleaning', 'D4341', 'BASIC',       285.00,
        'A deeper cleaning below the gum line (scaling and root planing) to treat gum disease.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Root Canal',    'D3330', 'MAJOR',      1000.00,
        'A procedure that removes infected tissue from inside a tooth and seals it, so the tooth can be saved instead of pulled.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Crown',         'D2740', 'MAJOR',      1400.00,
        'A custom cap placed over a damaged tooth to restore its shape, strength, and appearance.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)'),
    ('Implant',       'D6010', 'MAJOR',      2450.00,
        'An artificial tooth root placed in the jaw to support a replacement tooth.',
        'PLACEHOLDER: verify text and cost (Lincoln reference / FAIR Health)');

-- -----------------------------------------------------------------------------
-- benefit_usage — demo user 1, benefit year 2026.
--   Target state: $900 of the annual maximum USED, and the $50 deductible MET.
--   plan_paid sums to 900.00; applied_to_deductible sums to 50.00.
--   (These are engineered demo totals, not a real claims adjudication.)
-- -----------------------------------------------------------------------------
-- [PLACEHOLDER] the exact split of the $900 across services is illustrative;
-- only the TOTALS (used $900, deductible met $50) matter for the demo.
INSERT INTO benefit_usage
    (user_id, procedure_id, benefit_year, service_date, network_type,
     billed_amount, plan_paid, patient_paid, applied_to_deductible)
VALUES
    -- Root Canal (MAJOR) earlier in the year: deductible satisfied here.
    (1, (SELECT id FROM procedures WHERE name = 'Root Canal'),
        2026, '2026-03-12', 'IN_NETWORK', 1000.00, 475.00, 525.00, 50.00),
    -- A couple of preventive/basic visits bringing plan_paid total to $900.
    (1, (SELECT id FROM procedures WHERE name = 'Cleaning'),
        2026, '2026-04-02', 'IN_NETWORK',  125.00, 125.00,   0.00,  0.00),
    (1, (SELECT id FROM procedures WHERE name = 'Filling'),
        2026, '2026-06-18', 'IN_NETWORK',  250.00, 200.00,  50.00,  0.00),
    (1, (SELECT id FROM procedures WHERE name = 'Exam'),
        2026, '2026-08-05', 'IN_NETWORK',   75.00,  75.00,   0.00,  0.00),
    (1, (SELECT id FROM procedures WHERE name = 'X-Ray'),
        2026, '2026-08-05', 'IN_NETWORK',   85.00,  25.00,  60.00,  0.00);
-- plan_paid total: 475 + 125 + 200 + 75 + 25 = 900.00  (annual max used)
-- applied_to_deductible total: 50.00                   (deductible met -> true)
