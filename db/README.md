# Dental Benefits Optimizer — Database Layer (Neon / PostgreSQL)

Owner: **Gopal**. This directory is the database **source of truth** for the
codeLinc 11 Dental project. It holds plan rules, coverage rules, the procedure
catalog, per-user usage, and appointment history.

**The database does no benefit math.** It stores trusted facts and derives only
trivial values in queries (`remaining = annual_maximum − used`,
`deductible_met = SUM(applied_to_deductible) ≥ deductible`). All coverage %,
deductible application, and the annual-maximum cap are computed by **Jay's Java
calculator**. The AI never does math and never invents plan details.

## Files

| File | Purpose |
|---|---|
| `migrations/V1__schema.sql` | Core schema: `users`, `dental_plans`, `plan_coverage`, `procedures`, `benefit_usage`. |
| `migrations/V2__seed_data.sql` | Demo seed: Demo PPO plan, coverage rows, 9 canonical procedures, demo user 1 with $900 used / deductible met. |
| `migrations/V3__appointments.sql` | `appointments` + `appointment_procedures` (status + nullable urgency) and demo user 1's last appointment. |
| `queries.sql` | One verification query per required question (Q1–Q9). |

Files follow the **Flyway** naming convention `V<n>__<name>.sql` and are applied
in version order. The Spring Boot backend applies them on startup under the
`db` profile; you can also apply them manually (below).

## Design decisions (per the agreed contract)

- **Money** is `NUMERIC(10,2)` everywhere → `java.math.BigDecimal`. No floats.
- **Coverage is stored as rows**, one per `(plan_id, category, network_type)`,
  not columns. Adding a category or network type is an `INSERT`, not a schema
  change.
- **`fee_multiplier`** (default `1.0000`) lives on each coverage row so an
  in-network negotiated rate can differ from the out-of-network billed charge.
  Jay computes the cost basis as `procedures.reference_cost * fee_multiplier`,
  then applies `plan_pays_pct`.
- **Plan rules** (`dental_plans`, `plan_coverage`) are kept **separate** from
  **per-user, per-year usage** (`benefit_usage`). A new benefit year starts
  fresh; changing a plan rule never rewrites history.
- **Procedure names are canonical** and must match exactly:
  `Exam, X-Ray, Cleaning, Filling, Extraction, Deep Cleaning, Root Canal, Crown, Implant`.
  The AI maps free text to one of these; Jay looks them up by name.
- **`procedures.plain_description`** is curated trusted text (with a `source`
  column) so the AI explains procedures without inventing medical details.
- **`appointment_procedures.status`** ∈ `PERFORMED | RECOMMENDED | SCHEDULED`;
  **`urgency`** is nullable (`URGENT | SOON | CAN_WAIT`) because the sequencing
  feature needs it for recommended/scheduled work.

> **Placeholders:** every dollar amount and plain-language description in
> `V2__seed_data.sql` is marked `[PLACEHOLDER]` / `PLACEHOLDER: ...`. Verify
> against the Lincoln dental reference site and the FAIR Health cost estimator
> before the demo. The schema is final; only the magnitudes are placeholders.
> No real member data is used — all people are fictional.

## Applying the migrations

Use a **direct (non-pooled)** Neon connection string for migrations.

```bash
# From the repo root. Apply in order.
PSQL="psql postgresql://<user>:<pw>@<host>/<db>?sslmode=require"
$PSQL -v ON_ERROR_STOP=1 -f db/migrations/V1__schema.sql
$PSQL -v ON_ERROR_STOP=1 -f db/migrations/V2__seed_data.sql
$PSQL -v ON_ERROR_STOP=1 -f db/migrations/V3__appointments.sql

# Verify
$PSQL -f db/queries.sql
```

The Spring Boot backend reads `DATABASE_URL` / `DATABASE_USERNAME` /
`DATABASE_PASSWORD` (see `backend/.env.example`) and runs under
`SPRING_PROFILES_ACTIVE=db`.

## Repository operations (what Jay calls)

These are the five read operations the Java repository layer exposes. Each maps
to a verification query in `queries.sql`.

### `findPlanForUser(userId)`
- **Returns:** the user's `dental_plans` row — `annual_maximum`, `deductible`,
  `plan_year_start`, `plan_year_end`, `major_waiting_period_months`.
- **Answers:** **Q1** (which plan) and **Q2** (annual maximum).
- **SQL:** join `users → dental_plans` on `users.plan_id`.

### `findBenefitUsage(userId, year)`
- **Returns:** the user's `benefit_usage` rows for `benefit_year = year`
  (and/or the aggregates `SUM(plan_paid)` and `SUM(applied_to_deductible)`).
- **Answers:** **Q4** (how much of the annual benefit is used →
  `remaining = annual_maximum − SUM(plan_paid)`) and **Q3** (deductible met →
  `SUM(applied_to_deductible) ≥ plan deductible`). The comparison itself is done
  by Jay or the query; the DB just supplies the sums.

### `findProcedureByName(name)`
- **Returns:** the `procedures` row for the exact canonical `name` —
  `category`, `cdt_code`, `reference_cost`, `plain_description`, `source`.
- **Answers:** **Q5** (what category is a Crown) and **Q9** (trusted description
  of a Root Canal). Also supplies the cost basis Jay needs for an estimate.
- **Note:** name must match a canonical value exactly; the AI is responsible for
  mapping free text to one of them before this is called.

### `findCoverage(planId, procedureCategory, networkType)`
- **Returns:** the single `plan_coverage` row for that
  `(plan, category, network)` — `plan_pays_pct`, `fee_multiplier`,
  `deductible_applies`.
- **Answers:** **Q6** (in-network coverage for MAJOR) and **Q7** (out-of-network
  coverage). Called once per network to drive the in-vs-out comparison.

### `findRecentAppointments(userId)`
- **Returns:** the user's appointments (most recent first) with their
  `appointment_procedures` line items — `procedure name`, `status`, `urgency`,
  `tooth_number`.
- **Answers:** **Q8** (what was recommended at the last appointment — filter
  `status = 'RECOMMENDED'` on the latest `appointment_date`). Feeds the care
  sequencing / "the crown my dentist recommended" scenario.

## First end-to-end scenario this supports

> "How much will the crown my dentist recommended cost in network versus out of
> network?"

The data is in place:
- plan + annual maximum + deductible → `findPlanForUser(1)`
- deductible status + annual-max usage → `findBenefitUsage(1, 2026)`
  (demo state: **$900 used**, **$600 remaining**, **deductible met**)
- crown category + reference cost + description → `findProcedureByName('Crown')`
  (`MAJOR`, `$1,400` reference)
- in-network rule (50%) → `findCoverage(1, 'MAJOR', 'IN_NETWORK')`
- out-of-network rule (40%) → `findCoverage(1, 'MAJOR', 'OUT_OF_NETWORK')`
- what the dentist recommended → `findRecentAppointments(1)`
  (Crown `RECOMMENDED` / `SOON`, tooth #19)

Jay's calculator takes those facts and produces the `BenefitEstimate`
(`estimatedCost`, `estimatedInsurancePayment`, `estimatedPatientCost`,
`remainingAnnualBenefit`), capping insurance at the remaining annual maximum.

## Verified against PostgreSQL 18

All three migrations apply cleanly and all nine queries return the expected
demo results (verified on a local PG18 instance):

| Question | Result |
|---|---|
| Q1 plan | Demo PPO |
| Q2 annual max | 1500.00 |
| Q3 deductible met | met 50.00 ≥ 50.00 → **true** |
| Q4 used / remaining | 900.00 / 600.00 |
| Q5 crown category | MAJOR (D2740) |
| Q6 in-network MAJOR | 50.00% |
| Q7 out-of-network MAJOR | 40.00% |
| Q8 last appt recommended | Crown (SOON, #19), Filling (CAN_WAIT, #30) |
| Q9 root canal description | trusted plain-language sentence |
