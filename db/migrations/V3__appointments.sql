-- =============================================================================
-- codeLinc 11 — Dental Benefits Optimizer
-- V3: Appointments + appointment procedures (Neon / PostgreSQL)
--
-- Separated from V1 so the appointment history / care-sequencing feature can
-- evolve on its own. appointment_procedures carries a status and a nullable
-- urgency because the sequencing feature needs to know what was performed vs.
-- recommended, and how soon recommended work should happen.
--
-- (Answers Q8 "what procedures were recommended at the last appointment".)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- appointments — one row per visit for a user.
-- -----------------------------------------------------------------------------
CREATE TABLE appointments (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date    DATE NOT NULL,
    provider_name       TEXT,
    network_type        TEXT NOT NULL DEFAULT 'IN_NETWORK'
                        CHECK (network_type IN ('IN_NETWORK', 'OUT_OF_NETWORK')),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_user_date
    ON appointments (user_id, appointment_date DESC);

-- -----------------------------------------------------------------------------
-- appointment_procedures — line items on a visit.
--   status  : PERFORMED (done this visit), RECOMMENDED (dentist suggested it),
--             SCHEDULED (booked for later).
--   urgency : nullable. Only meaningful for RECOMMENDED/SCHEDULED work the
--             sequencer must prioritize. URGENT | SOON | CAN_WAIT.
--   tooth_number: optional Universal Numbering System tooth (1..32).
-- -----------------------------------------------------------------------------
CREATE TABLE appointment_procedures (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id      BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    procedure_id        BIGINT NOT NULL REFERENCES procedures(id),
    status              TEXT NOT NULL
                        CHECK (status IN ('PERFORMED', 'RECOMMENDED', 'SCHEDULED')),
    -- Nullable on purpose: PERFORMED work needs no urgency.
    urgency             TEXT
                        CHECK (urgency IS NULL OR urgency IN ('URGENT', 'SOON', 'CAN_WAIT')),
    tooth_number        SMALLINT CHECK (tooth_number IS NULL OR tooth_number BETWEEN 1 AND 32),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_procedures_appt
    ON appointment_procedures (appointment_id);
CREATE INDEX idx_appointment_procedures_status
    ON appointment_procedures (status);

-- -----------------------------------------------------------------------------
-- Seed: demo user 1's last appointment.
--   Exam and X-Ray PERFORMED; Crown and Filling RECOMMENDED.
--   The Crown recommendation drives the first end-to-end scenario
--   ("the crown my dentist recommended ... in network vs out of network").
-- -----------------------------------------------------------------------------
INSERT INTO appointments (user_id, appointment_date, provider_name, network_type, notes)
VALUES
    (1, '2026-09-15', 'Dr. Demo DDS', 'IN_NETWORK',
        'Routine visit. Exam and X-Ray performed; crown and filling recommended.');

-- The appointment just inserted is the most recent for user 1; resolve its id
-- and the procedure ids by canonical name so this stays robust.
INSERT INTO appointment_procedures (appointment_id, procedure_id, status, urgency, tooth_number, notes)
SELECT a.id, p.id, v.status, v.urgency, v.tooth_number, v.notes
FROM (
    VALUES
        ('Exam',    'PERFORMED',   NULL::TEXT,  NULL::SMALLINT, 'Routine check-up completed.'),
        ('X-Ray',   'PERFORMED',   NULL,        NULL,           'Bitewings taken.'),
        ('Crown',   'RECOMMENDED', 'SOON',      19::SMALLINT,   'Cracked lower-left molar; crown recommended.'),
        ('Filling', 'RECOMMENDED', 'CAN_WAIT',  30::SMALLINT,   'Small cavity on lower-right molar.')
) AS v(procedure_name, status, urgency, tooth_number, notes)
JOIN procedures p ON p.name = v.procedure_name
CROSS JOIN LATERAL (
    SELECT id FROM appointments
    WHERE user_id = 1
    ORDER BY appointment_date DESC, id DESC
    LIMIT 1
) a;
