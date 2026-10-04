# Molarity: AI Dental Benefits Optimizer

codeLinc Hackathon 2026. Molarity helps an employee describe the dental care they
need in plain language, understand their benefits in plain English, and — where
the data is wired up — see an estimated in- vs out-of-network out-of-pocket cost.

The project is a hackathon work-in-progress. Some capabilities run today, some run
only with a database and AWS access, and some are scaffolded for teammates to
finish. The **Feature status** table below says which is which, and the rest of the
README is careful not to imply more than the current code supports.

| Layer | Tech (verified in the tree) |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, React Router 7, Zustand 5 |
| 3D | Three.js + React Three Fiber v9 + drei v10 (procedural room kit, no model files), GSAP |
| Backend | Java 21 / Spring Boot 3.5.16 (`backend/`), AWS SDK for Java v2 |
| Database | PostgreSQL / Neon (schema + seed under `db/migrations/`) |
| AI | Amazon Bedrock (Converse API), default model `us.amazon.nova-2-lite-v1:0` |

## Feature status

| Capability | Status | Notes |
| --- | --- | --- |
| Walk-through dental-office UI (one route per room), Traditional + 3D views, WCAG 2.2 AA work | **Implemented** | Pure frontend. Runs offline. |
| Benefits-education chatbot (`/api/education/chat`) | **Implemented, wired end-to-end** | Frontend Imaging tab calls the backend and falls back to an in-browser glossary when the backend is down. |
| Procedure estimate + in/out-of-network comparison in the UI | **Implemented against an in-browser mock** | The UI's estimate assistant uses `frontend/src/lib/mockAssistant.ts`. It does **not** call the backend. |
| Backend analyze endpoint (`/api/analyze`): intent extraction → trusted-data pricing → plain-English explanation | **Implemented in the backend, not yet called by the frontend** | Requires the `db` profile + seed data, and AWS Bedrock access for intent extraction and narration. |
| Backend AI dev endpoints (`/api/ai/test`, `/api/ai/intent`, `/api/ai/explain-procedure`) | **Implemented** | Need Bedrock access. `/api/ai/test` returns a clean `502` without it. |
| Verified personal plan facts in the education chatbot | **Not available yet** | The default `PlanFactsProvider` returns nothing, so personal-plan questions get an "amounts unavailable" answer by design (see below). |
| Authenticated plan lookup / production-grade estimates | **Not implemented** | No auth layer; dollar values in the seed and the UI mock are illustrative placeholders. |

There is **no HTML prototype** and **no authenticated member lookup** in this
checkout. The frontend is the real UI; estimate numbers shown in the UI today come
from the in-browser mock, and the seeded database numbers are placeholders.

## The three capabilities, kept separate

1. **Procedure selection + estimate (UI).** The employee describes care ("root
   canal on tooth #14") or picks a tooth. Today the UI prices this through
   `frontend/src/lib/mockAssistant.ts` and the local estimator in
   `frontend/src/lib/estimate.ts` — fully offline. The backend has a real
   equivalent (`/api/analyze`) that is not yet wired to the UI.
2. **Plan-based estimate + network comparison (backend).** `/api/analyze` turns a
   natural-language message into a structured in- vs out-of-network comparison,
   using **only trusted database facts** for every price and coverage number. See
   the data-flow section.
3. **Benefits-education chatbot (backend + UI).** `/api/education/chat` answers
   general benefits questions ("what is a deductible?") from a reviewed glossary. It
   never computes a price; cost questions become a handoff flag back to the estimate
   flow. This is the one backend capability the frontend calls today.

## How the AI is (and is not) used

The AI **never calculates coverage or prices.** Two separate integrations:

- **Every result is the checked-in employee's.** Reception checks in an employee from the member
  database (`GET /api/members`); estimates (`/api/analyze` `userId`) and the chatbot's personal answers
  (`/api/education/chat` `memberId`) both use that person's plan and this year's usage. When the
  database is up, the app starts on the demo employee's real plan rather than the offline sample.
- **If Bedrock is unavailable**, `ResilientIntentExtractor` reads the question by keyword
  (`KeywordIntentExtractor`, `ProcedurePhrases`) so estimates keep working; prices still come only
  from the database and the calculator.

- **Procedure-intent + estimate explanation** (`/api/analyze`): Bedrock is used
  *only* to interpret the message into a structured `DentalIntent`
  (`BedrockIntentExtractor`). The orchestrator (`AnalysisService`) then verifies
  every actionable part against trusted data — it resolves the procedure against the
  catalog (never the AI's guessed CDT code), confirms a claimed recommendation
  against appointment history, and loads plan rules, usage and coverage from the
  data layer. The math is done by `BenefitCalculatorService` /
  `NetworkComparisonService`. The AI is called again at the end *only to narrate* the
  already-computed numbers (`AiService.explainEstimate`); if it errors or returns
  blank, the estimate stands unchanged.
- **Education chatbot** (`/api/education/chat`): has its **own** model ID
  (`EDUCATION_BEDROCK_MODEL_ID`), its own system prompt, and a deterministic
  glossary fallback. When a model is configured it may *rewrite* the deterministic
  answer in plainer language, but a guard rejects any rewrite that introduces a
  dollar amount not in the verified facts. With no model configured, the glossary
  answer is returned verbatim.

### Data flow for `/api/analyze`

```
client: { userId, message }           ← no prices/coverage ever accepted from the client
   │
   ▼
BedrockIntentExtractor  →  DentalIntent (COST_ESTIMATE | UNSUPPORTED)   [AI: interpret only]
   │
   ▼
AnalysisService  (verify against trusted DentalDataAccess)
   ├─ resolve spoken term → canonical procedure (catalog, not AI code)
   ├─ load active plan + derive benefit year (never hard-coded)
   ├─ confirm recommendation vs. appointment history (if claimed)
   ├─ require tooth number for tooth-specific procedures
   └─ load coverage + benefit usage (in + out of network)
   │
   ▼
NetworkComparisonService / BenefitCalculatorService   [deterministic math]
   │
   ▼
AiService.explainEstimate   [AI: narrate the fixed numbers only]
   │
   ▼
AnalysisResponse: kind=ESTIMATE (estimates[] + optional timing) OR kind=CLARIFICATION
```

When a precondition is missing (ambiguous procedure, no active plan, missing tooth,
no pricing rows, unsupported intent) the service returns a single plain-English
**clarification question** instead of guessing.

## Repository layout

```
backend/                      Spring Boot API + Bedrock (see "Backend")
db/
  migrations/
    V1__schema.sql            tables: users, dental_plans, plan_coverage, procedures, benefit_usage
    V2__seed_data.sql         demo seed: "Demo PPO" plan, 9 canonical procedures, demo user 1
    V3__appointments.sql      appointments + appointment_procedures (+ demo user 1's last visit)
    V4__more_members.sql      a second plan and four more fictional employees with 2026 usage
  queries.sql                 one verification query per required question (Q1–Q9)
  README.md                   database-layer documentation (owner: Gopal)
frontend/
  src/
    router.tsx                one route per room under the AppShell layout
    rooms.ts                  the room directory (paths, names, descriptions, prerequisites)
    routes/                   room pages: real, accessible content
    components/               layout shell, panels, tooth picker, education chat, 3D office, ...
    store/                    Zustand stores (session, dental, settings, ui, scene) + selectors
    lib/
      estimate.ts             coinsurance / deductible / annual-max estimator (UI)
      sequencing.ts           this year vs. after Jan 1 comparison (UI)
      mockAssistant.ts        OFFLINE stand-in for a procedure-estimate backend (not yet wired)
      educationChat.ts        client for POST /api/education/chat (+ offline glossary fallback)
    data/mockData.ts          demo plans for the offline UI (Lincoln Preferred PPO / High-Option)
    a11y/                     route focus, reduced motion, WebGL check, fixed-bar height vars
```

Theme colors are tokens in `frontend/src/index.css` (`@theme`; Tailwind v4 has no
`tailwind.config.js`).

## How the site is built

The site is a dental office you walk through, one route per room. **The HTML is the
real site.** Every heading, form, table and door is a normal element. The 3D office
is a background layer behind it: `aria-hidden`, never focusable, driven by native
page scroll (no `<ScrollControls>`).

| Route | Room | What happens there |
| --- | --- | --- |
| `/` | Entrance | Landing page |
| `/reception` | Reception | Check in a plan (sample or manual entry) |
| `/hallway` | Hallway | Every room, as door cards |
| `/operatory` | Operatory | Explore a procedure, describe care in words, or pick a tooth |
| `/imaging` | Imaging | Ask the benefits-education chat (works without a plan) |
| `/consult` | Consult office | What to do this plan year vs. after Jan 1 |
| `/billing` | Billing | What you pay, line items, in- vs out-of-network |
| `/providers` | Providers | In-network dentists, filtered (fictional demo listings) |
| `/records` | Records | Annual maximum, claims, reminders (`.ics` export) |
| `*` | Not found | Fallback route |

**Two views of the same pages:**
- **3D office (immersive):** text sits on frosted panels; as you scroll, the camera
  holds on the object each section is about, then glides to the next. Changing room
  flies the camera through a door.
- **Traditional:** the 3D code is never downloaded. The same pages as a plain, solid document: a rail with every room and this page's sections, one readable column (about 70 characters a line), sections as bands under hairlines, a footer. No glass, shadows, parallax or motion; 17px text; high-contrast and print styles. The layout lives in `frontend/src/traditional.css`.
  Turns on automatically for reduced-motion or when WebGL is unavailable. Either view
  can be picked in the header.

**Accessibility target:** WCAG 2.2 AA — skip link, one `<h1>` per room with focus
moving to it on room change, polite live-region announcements, two-color focus rings,
`scroll-padding` so fixed bars don't cover focused content, errors linked to fields,
tooth map as plain buttons.

## Prerequisites

- **Node.js** and **npm** for the frontend (built and verified with Vite 7; this
  checkout was last touched with Node 24 / npm 11, but any current LTS Node works).
- **Java 21** for the backend. The build targets Java 21 (`pom.xml` sets
  `java.version=21`) even if a newer JDK is your default.
- **AWS Bedrock access** (an `AWS_BEARER_TOKEN_BEDROCK` or standard AWS credentials)
  only for the AI endpoints. Health and the frontend run without it.
- **A PostgreSQL/Neon database** only for `/api/analyze` and other `db`-profile
  features. Health, `/api/ai/test`, and `/api/education/chat` (glossary mode) run
  without a database.

## Run the frontend

The frontend uses Vite via npm scripts — don't rely on a global `vite`.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build
npm run typecheck  # type-check only (tsc -b)
npm run lint       # eslint .
npm run preview    # preview the production build
```

The UI is fully demoable **offline**: the procedure-estimate assistant uses
`src/lib/mockAssistant.ts`, and the education chat falls back to an in-browser
glossary. Vite proxies `/api/*` to `http://localhost:8080`, so when the Spring Boot
service is running the education chat talks to the real backend automatically.

### The dentist map (optional)

The Providers page can show the (fictional) offices on a Mapbox map: pins follow the
filters, a pin opens that office's details, and each row has a **Show on map** button. In
the 3D view the map is tilted, with 3D buildings and a slow rotation you can stop; in the
Traditional view, and with reduced motion, it is flat and still.

It needs a Mapbox token. Copy `frontend/.env.example` to `frontend/.env` and set
`VITE_MAPBOX_TOKEN` to a **public** (`pk.`) token, restricted to your site's URL in your
Mapbox account (it ships in the browser bundle, and maps are billed per load). Without a
token, or without WebGL, the map section is simply left out and the list works as before.
`mapbox-gl` is its own lazy chunk, so it is only downloaded on this page.

## Run the backend (Spring Boot + Bedrock)

Java API under `backend/`, base package `com.codelinc.dental`. Use Java 21; if it
isn't your default JDK, point `JAVA_HOME` at it first.

```bash
cd backend

# Build + run tests
./mvnw clean verify          # or: mvnw.cmd clean verify   (Windows)

# Run WITHOUT a database: health, the AI dev endpoints and the education chat work;
# /api/analyze and /api/members answer 503 with a message saying to enable the db profile.
./mvnw spring-boot:run       # starts on http://localhost:8080

# Run WITH a database (enables /api/analyze, /api/members and the chatbot's plan facts).
# Spring does not read .env files: export the variables in this shell first. The URL is the
# JDBC form, e.g. jdbc:postgresql://<host>/<db>?sslmode=require (not the postgresql:// one psql uses).
export DATABASE_URL=... DATABASE_USERNAME=... DATABASE_PASSWORD=...
SPRING_PROFILES_ACTIVE=db ./mvnw spring-boot:run
```

Bedrock auth comes from the AWS SDK default credential chain. The app never reads
the token directly; export it in your shell:

```bash
export AWS_BEARER_TOKEN_BEDROCK="<your Bedrock API key>"
```

Without Bedrock credentials, the AI endpoints return a clean JSON error (for
example `/api/ai/test` returns `502`) and `/api/health` still works.

### Environment variables

Names only — see `backend/.env.example`. Never commit real values.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Neon/Postgres JDBC URL, e.g. `jdbc:postgresql://<host>/<db>?sslmode=require` | — (required under `db` profile) |
| `DATABASE_USERNAME` | database user | — |
| `DATABASE_PASSWORD` | database password | — |
| `BEDROCK_REGION` | Bedrock region | `us-east-2` |
| `BEDROCK_MODEL_ID` | model for intent extraction + estimate narration | `us.amazon.nova-2-lite-v1:0` |
| `EDUCATION_BEDROCK_ENABLED` | enable the education chatbot's model-rewrite step | `true` |
| `EDUCATION_BEDROCK_MODEL_ID` | dedicated model for the education chatbot; blank = deterministic glossary only | *(blank)* |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key, read by the AWS SDK credential chain | — |
| `CORS_ALLOWED_ORIGINS` | comma-separated allowed origins | `http://localhost:5173` |

The database layer is **opt-in** via the `db` Spring profile; `DataSource`/JPA
auto-configuration is excluded by default so the API boots for early development
before a database exists. Hibernate is `ddl-auto: none` — the schema is owned by
`db/migrations/`.

## API endpoints (present in code)

All under `/api`. Only contracts actually in the controllers are listed.

| Method & path | Purpose | Needs |
| --- | --- | --- |
| `GET /api/health` | liveness | nothing |
| `POST /api/ai/test` | dev Bedrock round-trip | Bedrock |
| `POST /api/ai/intent` | dev: classify a message into `DentalIntent` | Bedrock |
| `POST /api/ai/explain-procedure` | dev: plain-language procedure explanation | Bedrock |
| `POST /api/analyze` | estimate + in/out-network comparison, or a clarification | Bedrock + `db` profile + seed |
| `GET /api/members` | employees for the Reception check-in: plan, coverage and this year's usage (503 without `db`) | `db` profile + seed |
| `POST /api/education/chat` | benefits-education answer | nothing (model optional) |

Member list (Reception's "Who's checking in?"; the `id` is the `userId` for `/api/analyze`):

```bash
curl http://localhost:8080/api/members
# [{"id":"5","fullName":"Jordan Reyes","planName":"Demo PPO Plus","annualMaximum":2000.00,
#   "usedThisYear":1710.00,"remainingMaximum":290.00,"deductibleMet":50.00,"coverage":[...], ...}, ...]
```

Health:

```bash
curl http://localhost:8080/api/health
# {"status":"ok"}
```

Education chatbot (runs without a database or a model — glossary fallback):

```bash
curl -X POST http://localhost:8080/api/education/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is a deductible?"}'
```

```json
{
  "intent": "GENERAL_DEFINITION",
  "answer": "In general: A deductible is the amount you may need to pay ...",
  "personalPlanDataAvailable": null,
  "estimateHandoff": false,
  "termsUsed": ["deductible"],
  "modelUsed": false
}
```

Education chatbot response fields let the UI render the right state without parsing
prose:
- `estimateHandoff: true` — a cost question; route the user to the estimate flow (no
  price is computed here).
- `personalPlanDataAvailable: false` — a personal-plan question with no verified
  facts. **Today this is always the case**: the default `PlanFactsProvider`
  (`UnavailablePlanFactsProvider`) returns nothing, so the chatbot gives the general
  rule and says the specific amounts can't be verified yet. It becomes `true` only
  once a real, authenticated plan-facts provider is registered as a Spring bean.
- `personalPlanDataAvailable: null` — not a personal-plan question.

Analyze (needs the `db` profile, seed data, and Bedrock):

```bash
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","message":"how much is a crown on tooth 19 in vs out of network?"}'
```

The response is an `AnalysisResponse`: either `kind: "ESTIMATE"` with an `estimates`
array (one `IN_NETWORK` and one `OUT_OF_NETWORK` `BenefitEstimate`, plus optional
`timing`), or `kind: "CLARIFICATION"` with a single `clarificationQuestion`. The
client sends only `userId` and `message`; it never sends prices, coverage, or
usage — those trusted facts are loaded server-side.

## Database

The schema and demo seed live under `db/` (owner: Gopal); see `db/README.md` for the
full data model. Apply the migrations in order with a **direct (non-pooled)**
connection string:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/V1__schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/V2__seed_data.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/V3__appointments.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/V4__more_members.sql
```

Schema notes:
- Tables only (no views): `users`, `dental_plans`, `plan_coverage`, `procedures`,
  `benefit_usage` (V1), plus `appointments` and `appointment_procedures` (V3).
- Money is `NUMERIC(10,2)` → `BigDecimal`; enumerations are `TEXT + CHECK`.
- Coverage is stored as rows per `(plan, category, network)`, not columns.
- Nine canonical procedures: Exam, X-Ray, Cleaning, Filling, Extraction, Deep
  Cleaning, Root Canal, Crown, Implant. The AI maps free text to one of these.
- The database stores facts and does **no benefit math**; Java computes coverage,
  deductible application, and the annual-maximum cap.

**All seed values are illustrative placeholders**, not verified coverage. The demo
seed is a fictional "Demo PPO" plan ($1,500 annual max, $50 deductible, 2026) and
demo user 1 ($900 used / $600 remaining, deductible met, crown recommended on tooth
#19). Do not treat any dollar amount as real benefit data.

> **Estimate disclaimer.** Any cost figure the app shows is an estimate for guidance
> only. Actual coverage and payment are determined by the insurer. The numbers in
> this checkout (UI mock and database seed alike) are illustrative placeholders.

## Tests, mocks, and limitations

Backend tests live under `backend/src/test` and run with `./mvnw clean verify`
(JUnit via `spring-boot-starter-test`). They cover the controllers
(`HealthControllerTest`, `AnalysisControllerTest`, `EducationChatControllerTest`),
the JDBC data access (`JdbcDentalDataAccessTest`), the orchestration
(`AnalysisServiceTest`), the calculators (`BenefitCalculatorServiceTest`,
`NetworkComparisonServiceTest`, `TreatmentTimingServiceTest`), the Bedrock
integrations (`BedrockAiServiceTest`, `BedrockIntentExtractorTest`,
`BedrockProcedureExplanationServiceTest`), and the education chatbot
(`EducationChatServiceTest`).

- `AnalysisServiceTest` exercises the orchestration against an **in-memory fake**
  `DentalDataAccess`, so the analyze logic is tested without a real database. The
  live `/api/analyze` path still needs the `db` profile and seed data.
- The Bedrock tests do not call AWS; the AI client is stubbed.
- The frontend has no automated test runner configured; `npm run build` /
  `npm run typecheck` / `npm run lint` are the available checks.

Known limitations: the frontend's procedure estimate uses the in-browser mock and is
not wired to `/api/analyze`; verified personal plan facts are not available to the
education chatbot yet; there is no authentication; and all monetary values are
placeholders.

## The 3D office

The rooms live in `frontend/src/components/3d/`, one file each (Entrance, Reception,
Hallway, Operatory, Imaging, Consult, Billing, Providers, Records). Each is a cutaway room built
procedurally from `roomKit.jsx` — **nothing is downloaded**; textures, bump and
roughness maps are drawn on canvases in code. Each room exports `STOPS` (one camera
stop per page section, keyed by the `<Panel>` id) and `DOORS` (for the fly-through on
route change). `DentalOffice.jsx` mounts one room at a time with the camera rig and
`STATIONS`; `useScrollStops.ts` drives scroll progress via ScrollTrigger. With
reduced motion, door transitions become a short cross-fade. The whole 3D layer is a
lazy chunk that the Traditional view never loads.

## Team boundaries

These describe who owns what, not proof that unmerged features exist on this branch:

- **This branch** focuses on Bedrock/AI and the benefits-education chatbot.
- **Jay** owns backend orchestration and benefit calculations. The seams are already
  in the code: the education chatbot depends on the `PlanFactsProvider` interface
  (default `UnavailablePlanFactsProvider` until Jay's authenticated provider is
  registered), and `AnalysisService` depends on the `DentalDataAccess` port.
- **Gopal** owns the database models and migrations under `db/`.

Confirmed remaining integration work, from the current code:
- Wire the frontend procedure-estimate assistant to the backend (today it uses
  `mockAssistant.ts`; the backend equivalent is `/api/analyze`).
- Register a real `PlanFactsProvider` so the education chatbot can answer personal
  questions with verified amounts.

## Claude Code skills

`.claude/skills/` holds skills that Claude Code loads in sessions on this repo,
including `design-taste-frontend` (a frontend design "taste skill"). This project's
own rules win where they disagree: WCAG 2.2 AA, the blue/mint/sage tokens in
`frontend/src/index.css`, Inter, lucide icons, GSAP + React Three Fiber, reduced
motion, and the Traditional view.
