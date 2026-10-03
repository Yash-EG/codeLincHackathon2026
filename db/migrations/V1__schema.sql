-- =============================================================================
-- Dental Benefits Optimizer — core schema (Neon / PostgreSQL 15+)
--
-- Conventions
--   * Enumerations are TEXT + CHECK (not PG enums) so Spring Data JPA can map
--     them with @Enumerated(EnumType.STRING) and no custom Hibernate types.
--   * Money is NUMERIC(10,2) (-> java.math.BigDecimal).
--   * Percentages are NUMERIC(5,2) in the range 0..100 ("plan pays 80.00%").
--   * Tooth numbers use the Universal Numbering System (1-32, permanent teeth).
--   * gen_random_uuid() is built into PostgreSQL 13+, no extension required.
--
-- File name follows Flyway convention (V<version>__<name>.sql) so the Spring
-- Boot backend can apply it directly. Run with a *direct* (non-pooled) Neon
-- connection string when migrating.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users (mock employee profiles)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    full_name       TEXT NOT NULL,
    date_of_birth   DATE,
    zip_code        TEXT,
    employer        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Insurance plans
-- -----------------------------------------------------------------------------
CREATE TABLE insurance_plans (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_name                    TEXT NOT NULL,
    plan_name                       TEXT NOT NULL,
    plan_type                       TEXT NOT NULL
        CHECK (plan_type IN ('PPO', 'DHMO', 'INDEMNITY', 'EPO')),
    monthly_premium                 NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_premium >= 0),

    -- Deductibles (per benefit period)
    deductible_individual_in        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deductible_individual_in >= 0),
    deductible_individual_out       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deductible_individual_out >= 0),
    deductible_family_in            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deductible_family_in >= 0),
    deductible_family_out           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deductible_family_out >= 0),

    -- Maximums. NULL annual_maximum = unlimited (typical DHMO).
    -- NULL annual_maximum_out_network = shares the in-network maximum.
    annual_maximum                  NUMERIC(10,2) CHECK (annual_maximum >= 0),
    annual_maximum_out_network      NUMERIC(10,2) CHECK (annual_maximum_out_network >= 0),
    ortho_lifetime_maximum          NUMERIC(10,2) CHECK (ortho_lifetime_maximum >= 0),

    -- Maximum rollover: if plan_paid for the year stays under the threshold,
    -- rollover_amount is banked toward next year's maximum, up to rollover_cap.
    rollover_enabled                BOOLEAN NOT NULL DEFAULT false,
    rollover_threshold              NUMERIC(10,2) CHECK (rollover_threshold >= 0),
    rollover_amount                 NUMERIC(10,2) CHECK (rollover_amount >= 0),
    rollover_cap                    NUMERIC(10,2) CHECK (rollover_cap >= 0),

    -- How out-of-network claims are reimbursed, e.g. 'UCR_80' = 80th percentile
    -- of usual & customary charges; 'MAC' = maximum allowable charge.
    oon_reimbursement_basis         TEXT NOT NULL DEFAULT 'UCR_80',

    -- Raw, jargon-heavy plan language. Fed to Bedrock for plain-English translation.
    summary_of_benefits             TEXT,

    is_active                       BOOLEAN NOT NULL DEFAULT true,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (carrier_name, plan_name)
);

-- Coinsurance by coverage class (the classic "100 / 80 / 50" structure).
CREATE TABLE plan_coverage_tiers (
    plan_id                     UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
    coverage_class              TEXT NOT NULL
        CHECK (coverage_class IN ('PREVENTIVE', 'BASIC', 'MAJOR', 'ORTHODONTIC')),
    plan_pays_pct_in_network    NUMERIC(5,2) NOT NULL CHECK (plan_pays_pct_in_network BETWEEN 0 AND 100),
    plan_pays_pct_out_network   NUMERIC(5,2) NOT NULL CHECK (plan_pays_pct_out_network BETWEEN 0 AND 100),
    deductible_applies          BOOLEAN NOT NULL DEFAULT true,
    waiting_period_months       SMALLINT NOT NULL DEFAULT 0 CHECK (waiting_period_months >= 0),
    PRIMARY KEY (plan_id, coverage_class)
);

-- -----------------------------------------------------------------------------
-- CDT procedure catalog + regional fee schedule
-- -----------------------------------------------------------------------------
CREATE TABLE cdt_procedures (
    cdt_code                TEXT PRIMARY KEY CHECK (cdt_code ~ '^D[0-9]{4}$'),
    category                TEXT NOT NULL CHECK (category IN (
                                'DIAGNOSTIC', 'PREVENTIVE', 'RESTORATIVE', 'ENDODONTICS',
                                'PERIODONTICS', 'PROSTHODONTICS_REMOVABLE', 'IMPLANT',
                                'PROSTHODONTICS_FIXED', 'ORAL_SURGERY', 'ORTHODONTICS',
                                'ADJUNCTIVE')),
    default_coverage_class  TEXT NOT NULL
        CHECK (default_coverage_class IN ('PREVENTIVE', 'BASIC', 'MAJOR', 'ORTHODONTIC')),
    short_name              TEXT NOT NULL,
    plain_description       TEXT NOT NULL,
    -- Everyday words patients use ("cap", "filling") to help map natural-language input.
    common_aliases          TEXT[] NOT NULL DEFAULT '{}',
    is_tooth_specific       BOOLEAN NOT NULL DEFAULT false,
    -- Typical frequency limitation, e.g. 2 per 12 months. NULL = no limit.
    frequency_count         SMALLINT CHECK (frequency_count > 0),
    frequency_months        SMALLINT CHECK (frequency_months > 0),
    CHECK ((frequency_count IS NULL) = (frequency_months IS NULL))
);

CREATE INDEX idx_cdt_procedures_aliases ON cdt_procedures USING GIN (common_aliases);

-- Plan-specific deviations from the catalog defaults.
CREATE TABLE plan_procedure_overrides (
    plan_id             UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
    cdt_code            TEXT NOT NULL REFERENCES cdt_procedures(cdt_code),
    coverage_class      TEXT CHECK (coverage_class IN ('PREVENTIVE', 'BASIC', 'MAJOR', 'ORTHODONTIC')),
    is_excluded         BOOLEAN NOT NULL DEFAULT false,
    frequency_count     SMALLINT CHECK (frequency_count > 0),
    frequency_months    SMALLINT CHECK (frequency_months > 0),
    notes               TEXT,
    PRIMARY KEY (plan_id, cdt_code),
    CHECK ((frequency_count IS NULL) = (frequency_months IS NULL))
);

CREATE INDEX idx_plan_procedure_overrides_cdt ON plan_procedure_overrides (cdt_code);

-- ucr_fee        = usual & customary charge (what an out-of-network dentist bills)
-- in_network_fee = negotiated PPO fee (what an in-network dentist may charge)
CREATE TABLE procedure_fees (
    cdt_code        TEXT NOT NULL REFERENCES cdt_procedures(cdt_code) ON DELETE CASCADE,
    region_code     TEXT NOT NULL DEFAULT 'NATIONAL',
    ucr_fee         NUMERIC(10,2) NOT NULL CHECK (ucr_fee >= 0),
    in_network_fee  NUMERIC(10,2) NOT NULL CHECK (in_network_fee >= 0),
    PRIMARY KEY (cdt_code, region_code),
    CHECK (in_network_fee <= ucr_fee)
);

-- -----------------------------------------------------------------------------
-- Enrollment, usage history and AI-generated treatment plans
-- -----------------------------------------------------------------------------
CREATE TABLE plan_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id             UUID NOT NULL REFERENCES insurance_plans(id),
    coverage_tier       TEXT NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (coverage_tier IN ('EMPLOYEE', 'EMPLOYEE_SPOUSE', 'EMPLOYEE_CHILDREN', 'FAMILY')),
    region_code         TEXT NOT NULL DEFAULT 'NATIONAL',
    plan_year_start     DATE NOT NULL,
    plan_year_end       DATE NOT NULL,
    -- Rollover dollars carried into this plan year (added to the annual maximum).
    rollover_balance    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (rollover_balance >= 0),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (plan_year_end > plan_year_start),
    UNIQUE (user_id, plan_id, plan_year_start)
);

CREATE INDEX idx_plan_enrollments_user ON plan_enrollments (user_id);
CREATE INDEX idx_plan_enrollments_plan ON plan_enrollments (plan_id);

-- Adjudicated claims: the source of truth for "annual maximum used".
CREATE TABLE benefit_claims (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id           UUID NOT NULL REFERENCES plan_enrollments(id) ON DELETE CASCADE,
    cdt_code                TEXT NOT NULL REFERENCES cdt_procedures(cdt_code),
    tooth_number            SMALLINT CHECK (tooth_number BETWEEN 1 AND 32),
    service_date            DATE NOT NULL,
    network_tier            TEXT NOT NULL CHECK (network_tier IN ('IN_NETWORK', 'OUT_OF_NETWORK')),
    billed_amount           NUMERIC(10,2) NOT NULL CHECK (billed_amount >= 0),
    allowed_amount          NUMERIC(10,2) NOT NULL CHECK (allowed_amount >= 0),
    plan_paid               NUMERIC(10,2) NOT NULL CHECK (plan_paid >= 0),
    patient_paid            NUMERIC(10,2) NOT NULL CHECK (patient_paid >= 0),
    applied_to_deductible   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (applied_to_deductible >= 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_benefit_claims_enrollment_date ON benefit_claims (enrollment_id, service_date);
CREATE INDEX idx_benefit_claims_cdt ON benefit_claims (cdt_code);

-- AI-sequenced care plan: one row per recommended procedure on the timeline.
CREATE TABLE treatment_plan_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id           UUID NOT NULL REFERENCES plan_enrollments(id) ON DELETE CASCADE,
    cdt_code                TEXT NOT NULL REFERENCES cdt_procedures(cdt_code),
    tooth_number            SMALLINT CHECK (tooth_number BETWEEN 1 AND 32),
    surfaces                TEXT CHECK (surfaces ~ '^[MODBLFI]{1,5}$'),
    network_tier            TEXT NOT NULL DEFAULT 'IN_NETWORK'
        CHECK (network_tier IN ('IN_NETWORK', 'OUT_OF_NETWORK')),
    status                  TEXT NOT NULL DEFAULT 'PROPOSED'
        CHECK (status IN ('PROPOSED', 'SCHEDULED', 'COMPLETED', 'DEFERRED')),
    urgency                 TEXT NOT NULL DEFAULT 'SOON'
        CHECK (urgency IN ('URGENT', 'SOON', 'ELECTIVE')),
    recommended_date        DATE,
    sequence_order          SMALLINT,
    estimated_fee           NUMERIC(10,2) CHECK (estimated_fee >= 0),
    estimated_plan_pays     NUMERIC(10,2) CHECK (estimated_plan_pays >= 0),
    estimated_patient_pays  NUMERIC(10,2) CHECK (estimated_patient_pays >= 0),
    user_input_text         TEXT,   -- what the user typed ("my back molar hurts")
    ai_rationale            TEXT,   -- why the model placed it here on the timeline
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatment_plan_items_enrollment ON treatment_plan_items (enrollment_id, recommended_date);
CREATE INDEX idx_treatment_plan_items_cdt ON treatment_plan_items (cdt_code);

-- =============================================================================
-- Views
-- =============================================================================

-- Every procedure resolved against every plan and fee region: coverage class
-- (override > catalog default), coinsurance, deductible rule, frequency and fees.
CREATE VIEW v_plan_procedure_coverage AS
SELECT
    p.id                                                AS plan_id,
    p.plan_name,
    c.cdt_code,
    c.short_name,
    c.category,
    COALESCE(o.coverage_class, c.default_coverage_class) AS coverage_class,
    NOT COALESCE(o.is_excluded, false)                  AS is_covered,
    CASE WHEN COALESCE(o.is_excluded, false) THEN 0.00
         ELSE COALESCE(t.plan_pays_pct_in_network, 0.00) END  AS plan_pays_pct_in_network,
    CASE WHEN COALESCE(o.is_excluded, false) THEN 0.00
         ELSE COALESCE(t.plan_pays_pct_out_network, 0.00) END AS plan_pays_pct_out_network,
    COALESCE(t.deductible_applies, true)                AS deductible_applies,
    COALESCE(t.waiting_period_months, 0)                AS waiting_period_months,
    COALESCE(o.frequency_count, c.frequency_count)      AS frequency_count,
    COALESCE(o.frequency_months, c.frequency_months)    AS frequency_months,
    f.region_code,
    f.in_network_fee,
    f.ucr_fee,
    o.notes                                             AS override_notes
FROM insurance_plans p
CROSS JOIN cdt_procedures c
LEFT JOIN plan_procedure_overrides o
       ON o.plan_id = p.id AND o.cdt_code = c.cdt_code
LEFT JOIN plan_coverage_tiers t
       ON t.plan_id = p.id
      AND t.coverage_class = COALESCE(o.coverage_class, c.default_coverage_class)
LEFT JOIN procedure_fees f
       ON f.cdt_code = c.cdt_code;

-- One row per enrollment: annual-maximum usage, deductible progress and the
-- "use it or lose it" flag. Drives the dashboard progress bar.
CREATE VIEW v_enrollment_benefit_summary AS
SELECT
    e.id                                                        AS enrollment_id,
    e.user_id,
    u.full_name,
    p.id                                                        AS plan_id,
    p.carrier_name,
    p.plan_name,
    e.plan_year_start,
    e.plan_year_end,
    p.annual_maximum,
    e.rollover_balance,
    p.annual_maximum + e.rollover_balance                       AS effective_maximum,
    claims.used_to_date,
    open_items.planned_plan_pays,
    GREATEST(p.annual_maximum + e.rollover_balance - claims.used_to_date, 0) AS remaining_maximum,
    p.deductible_individual_in                                  AS deductible,
    claims.deductible_met,
    GREATEST(p.deductible_individual_in - claims.deductible_met, 0)         AS deductible_remaining,
    (e.plan_year_end - CURRENT_DATE)                            AS days_remaining,
    (
        e.plan_year_end - CURRENT_DATE BETWEEN 0 AND 90
        AND p.annual_maximum IS NOT NULL
        AND p.annual_maximum + e.rollover_balance - claims.used_to_date > 0
    )                                                           AS benefits_expiring_soon
FROM plan_enrollments e
JOIN users u            ON u.id = e.user_id
JOIN insurance_plans p  ON p.id = e.plan_id
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(bc.plan_paid), 0)::NUMERIC(10,2)             AS used_to_date,
           COALESCE(SUM(bc.applied_to_deductible), 0)::NUMERIC(10,2) AS deductible_met
    FROM benefit_claims bc
    WHERE bc.enrollment_id = e.id
      AND bc.service_date BETWEEN e.plan_year_start AND e.plan_year_end
) claims
CROSS JOIN LATERAL (
    SELECT COALESCE(SUM(ti.estimated_plan_pays), 0)::NUMERIC(10,2) AS planned_plan_pays
    FROM treatment_plan_items ti
    WHERE ti.enrollment_id = e.id
      AND ti.status IN ('PROPOSED', 'SCHEDULED')
      AND (ti.recommended_date IS NULL
           OR ti.recommended_date BETWEEN e.plan_year_start AND e.plan_year_end)
) open_items;
