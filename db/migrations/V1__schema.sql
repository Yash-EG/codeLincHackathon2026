-- =============================================================================
-- codeLinc 11 — Dental Benefits Optimizer
-- V1: Core schema (Neon / PostgreSQL 15+)
--
-- Owner: Gopal (database layer). The database is the SOURCE OF TRUTH for
-- trusted facts. It stores plan rules, coverage rules, the procedure catalog,
-- per-user usage and appointment history. It does NOT do any benefit math:
-- Jay's Java calculator reads these rows and computes coverage %, deductible
-- application and the annual-maximum cap. The AI never does math or invents
-- plan details.
--
-- Conventions
--   * Money is NUMERIC(10,2) -> java.math.BigDecimal. Never floating point.
--   * Coverage % is NUMERIC(5,2) in 0..100 ("plan pays 80.00%").
--   * Enumerations are TEXT + CHECK (not PG enums) so Spring Data JPA maps them
--     with @Enumerated(EnumType.STRING) and no custom Hibernate types.
--   * Procedure categories: PREVENTIVE, BASIC, MAJOR.
--   * Network types:        IN_NETWORK, OUT_OF_NETWORK.
--   * Plan rules (dental_plans, plan_coverage) are kept SEPARATE from per-user,
--     per-year usage (benefit_usage). Changing a plan rule never rewrites a
--     user's history.
--   * Coverage is stored as ROWS (plan + category + network -> %), not columns,
--     so adding a category or a network type needs no schema change.
--
-- File name follows the Flyway convention V<version>__<name>.sql so the Spring
-- Boot backend applies it directly. Migrate with a *direct* (non-pooled) Neon
-- connection string.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users — mock employee profiles. (Answers Q1 by joining to a plan.)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    full_name   TEXT NOT NULL,
    plan_id     BIGINT NOT NULL,            -- FK added after dental_plans exists
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- dental_plans — one row per plan. Holds annual maximum, deductible, the plan
-- year window (for end-of-year reminders) and a waiting period for major
-- services. (Answers Q1 "which plan" and Q2 "annual maximum".)
-- -----------------------------------------------------------------------------
CREATE TABLE dental_plans (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                        TEXT NOT NULL UNIQUE,
    annual_maximum              NUMERIC(10,2) NOT NULL CHECK (annual_maximum >= 0),
    -- Individual calendar-year deductible. "Deductible met?" is deductible_met
    -- (from usage) >= this amount — computed by a query or by Jay, not stored.
    deductible                  NUMERIC(10,2) NOT NULL CHECK (deductible >= 0),
    plan_year_start             DATE NOT NULL,
    plan_year_end               DATE NOT NULL,
    -- Waiting period (months) before MAJOR services are covered. 0 = none.
    major_waiting_period_months SMALLINT NOT NULL DEFAULT 0
                                CHECK (major_waiting_period_months >= 0),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (plan_year_end > plan_year_start)
);

-- Now that dental_plans exists, wire up the user -> plan foreign key.
ALTER TABLE users
    ADD CONSTRAINT fk_users_plan
    FOREIGN KEY (plan_id) REFERENCES dental_plans(id);

CREATE INDEX idx_users_plan ON users (plan_id);

-- -----------------------------------------------------------------------------
-- plan_coverage — coverage stored as ROWS, one per (plan, category, network).
--
-- plan_pays_pct : what the plan pays for that class/network (0..100).
-- fee_multiplier: scales the catalog reference cost for this network so the
--                 in-network negotiated rate can differ from the out-of-network
--                 billed charge. Default 1.00 = use the reference cost as-is.
--                 Jay multiplies procedures.reference_cost * fee_multiplier to
--                 get the cost basis for this network, then applies coverage.
-- deductible_applies: whether this class consumes the deductible (preventive
--                 is typically waived).
--
-- Adding a new category or network = INSERT rows here. No schema change.
-- (Answers Q6 in-network major coverage and Q7 out-of-network coverage.)
-- -----------------------------------------------------------------------------
CREATE TABLE plan_coverage (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plan_id             BIGINT NOT NULL REFERENCES dental_plans(id) ON DELETE CASCADE,
    category            TEXT NOT NULL
                        CHECK (category IN ('PREVENTIVE', 'BASIC', 'MAJOR')),
    network_type        TEXT NOT NULL
                        CHECK (network_type IN ('IN_NETWORK', 'OUT_OF_NETWORK')),
    plan_pays_pct       NUMERIC(5,2) NOT NULL
                        CHECK (plan_pays_pct BETWEEN 0 AND 100),
    fee_multiplier      NUMERIC(6,4) NOT NULL DEFAULT 1.0000
                        CHECK (fee_multiplier >= 0),
    deductible_applies  BOOLEAN NOT NULL DEFAULT true,
    -- Exactly one coverage rule per plan/category/network.
    UNIQUE (plan_id, category, network_type)
);

CREATE INDEX idx_plan_coverage_lookup
    ON plan_coverage (plan_id, category, network_type);

-- -----------------------------------------------------------------------------
-- procedures — the canonical procedure catalog. Names are canonical and must
-- match EXACTLY (the AI maps free text to one of these; Jay looks them up by
-- name). plain_description is a curated, trusted sentence so the AI never
-- invents medical details. source records where that description came from.
-- (Answers Q5 "what category is a crown" and Q9 "trusted root canal text".)
-- -----------------------------------------------------------------------------
CREATE TABLE procedures (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Canonical display name. Must be one of the agreed set:
    -- Exam, X-Ray, Cleaning, Filling, Extraction, Deep Cleaning,
    -- Root Canal, Crown, Implant.
    name                TEXT NOT NULL UNIQUE,
    -- CDT code where applicable (ADA Current Dental Terminology). Nullable
    -- because the demo keys on canonical name, not code.
    cdt_code            TEXT UNIQUE CHECK (cdt_code IS NULL OR cdt_code ~ '^D[0-9]{4}$'),
    category            TEXT NOT NULL
                        CHECK (category IN ('PREVENTIVE', 'BASIC', 'MAJOR')),
    -- Reference cost BEFORE any network fee multiplier is applied. Jay scales
    -- this per network via plan_coverage.fee_multiplier.
    reference_cost      NUMERIC(10,2) NOT NULL CHECK (reference_cost >= 0),
    -- Curated plain-language description. Trusted; the AI reads it verbatim.
    plain_description   TEXT NOT NULL,
    -- Where plain_description / reference_cost came from (so we can defend it
    -- to judges and swap placeholders for verified values later).
    source              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procedures_category ON procedures (category);

-- -----------------------------------------------------------------------------
-- benefit_usage — per-user, per-year usage. The SOURCE OF TRUTH for
-- "how much of the annual maximum has been used" and "how much of the
-- deductible has been met". One row per adjudicated service.
--
-- plan_paid           -> summed for annual-maximum-used.
-- applied_to_deductible -> summed for deductible-met.
-- benefit_year        -> the plan year the usage counts against (keeps rules
--                        separate from usage; a new year starts fresh).
--
-- Kept SEPARATE from plan rules on purpose. (Answers Q3 "deductible met?" and
-- Q4 "how much annual benefit used".)
-- -----------------------------------------------------------------------------
CREATE TABLE benefit_usage (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    procedure_id            BIGINT REFERENCES procedures(id),
    benefit_year            SMALLINT NOT NULL CHECK (benefit_year BETWEEN 2000 AND 2100),
    service_date            DATE NOT NULL,
    network_type            TEXT NOT NULL
                            CHECK (network_type IN ('IN_NETWORK', 'OUT_OF_NETWORK')),
    billed_amount           NUMERIC(10,2) NOT NULL CHECK (billed_amount >= 0),
    -- Amount the plan paid; this is what counts against the annual maximum.
    plan_paid               NUMERIC(10,2) NOT NULL CHECK (plan_paid >= 0),
    -- Amount the patient paid out of pocket (informational).
    patient_paid            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (patient_paid >= 0),
    -- Portion of this service that went toward satisfying the deductible.
    applied_to_deductible   NUMERIC(10,2) NOT NULL DEFAULT 0
                            CHECK (applied_to_deductible >= 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_benefit_usage_user_year
    ON benefit_usage (user_id, benefit_year);
CREATE INDEX idx_benefit_usage_procedure
    ON benefit_usage (procedure_id);
