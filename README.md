# Molarity: AI Dental Benefits Optimizer

Codelinc Hackathon 2026. Describe the dental care you need in plain language, and Molarity:

1. **Interprets it**: maps "root canal on tooth #14" to CDT `D3330` on tooth #14, and knows a crown has to follow.
2. **Translates the plan jargon**: shows what insurance pays and what you pay, in and out of network.
3. **Sequences the care**: spreads treatment across plan years so the annual maximum gets used and nothing expires unused.

| Layer | Tech |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7, Zustand |
| 3D | Three.js via React Three Fiber v9 + drei (procedural room kit, no model files), GSAP ScrollTrigger |
| Backend | Java 21 / Spring Boot 3.5 (`backend/`, see below) |
| Database | Neon (serverless Postgres) |
| AI | Amazon Bedrock |

## How the site is built

The site is a dental office you walk through, one route per room. **The HTML is the real site.** Every heading, form, table and door is a normal element. The 3D office is a background layer behind it: `aria-hidden`, never focusable, and driven by native page scroll. It never uses `<ScrollControls>`, which takes over scrolling.

| Route | Room | What happens there |
| --- | --- | --- |
| `/` | Entrance | Landing page |
| `/reception` | Reception | Check in a plan (sample or manual entry) |
| `/hallway` | Hallway | Every room, as door cards |
| `/operatory` | Operatory | Describe care in words, or pick a tooth from the tooth buttons |
| `/imaging` | Imaging | Coverage tiers, frequency limits, fine print in plain English |
| `/consult` | Consult office | What to do this plan year vs. after Jan 1 |
| `/billing` | Billing | What you pay, line items, in- vs out-of-network |
| `/records` | Records | Annual maximum, claims, reminders (`.ics` export) |

Every room shares a persistent shell: a skip link, a header with the **Directory** and the view toggle, an always-visible **annual max bar**, and **Ask AI** (a native modal `<dialog>`).

**Two views of the same pages:**
- **3D office (immersive):** text sits on frosted panels (at least 88% opaque, so contrast holds over any scene). As you scroll, the camera holds on the object each section is about, then glides to the next one. Changing room flies the camera through a door.
- **Traditional:** the 3D code is never downloaded, and panels are solid with no motion. This view turns on automatically when the OS asks for reduced motion or WebGL is unavailable. Either view can be picked in the header.

**Accessibility target:** WCAG 2.2 AA. The skip link, one `<h1>` per room, and focus moving to that `<h1>` on room change are built in. Arrivals are announced in a polite live region. Focus rings use two colors. `scroll-padding` keeps the fixed bars from covering focused content. Errors are linked to their form fields. The tooth map is plain buttons.

## Repository layout

```
backend/                    Spring Boot API + Bedrock (see "Backend" below)
db/migrations/
  V1__schema.sql            tables + views (Flyway naming)
  V2__seed_mock_data.sql    3 fictional plans, 28 CDT codes, 3 demo users
frontend/src/
  rooms.ts                  the room directory (paths, names, descriptions, prerequisites)
  router.tsx                one route per room under the AppShell layout
  routes/                   room pages: real, accessible content
  components/layout/        AppShell, Header, Directory, ViewToggle, MaxBar, AskAiDialog, SkipLink, LiveRegion
  components/               Panel, RoomIntro, DoorCard, ToothPicker, CheckInForm, AnnualMaxProgress, ...
  components/panels/        the four main panels: PlanInput, TreatmentMap, CostBreakdown, Timeline
  components/3d/            the background 3D office (lazy chunk)
    SceneRoot.tsx           aria-hidden wrapper at z-index -1: canvas + fade overlay, reads the scene store
    useScrollStops.ts       ScrollTrigger per [data-camera] section -> scroll progress
    DentalOffice.jsx        mounts one room at a time, camera rig, door fly-throughs, STATIONS
    roomKit.jsx             procedural textures, materials, room shell, doors, furniture, lights
    <Name>Room.jsx          one room each; exports STOPS (camera per section) and DOORS
  store/
    sessionStore.ts         plan, benefits, procedures, next-year care, AI analysis, chat (sessionStorage only)
    useDentalStore.ts       the brief's store API (annualMax, used, pending, ...) over the session store
    selectors.ts            line items, totals, annual max, next-year plan (derived, never stored)
    settingsStore.ts        view mode (localStorage)
    uiStore.ts  sceneStore.ts
  a11y/                     route focus, reduced motion, WebGL check, fixed-bar height vars
  lib/estimate.ts           coinsurance / deductible / annual-max estimator
  lib/sequencing.ts         this year vs. after Jan 1: what splitting care across the reset saves
  lib/mockAssistant.ts      offline stand-in for the Bedrock endpoint
  data/mockData.ts          the demo plan (Lincoln Preferred PPO: $1,500 max, $400 used)
```

Theme colors are tokens in `src/index.css` (`@theme`; Tailwind v4 has no `tailwind.config.js`). The palette is blue, mint and sage, and each text pair's contrast ratio is noted next to it.

## Run the frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run lint
```

The UI is fully demoable offline: `src/lib/mockAssistant.ts` stands in for the backend. Vite proxies `/api/*` to `http://localhost:8080` for when the Spring Boot service exists.

## Database (Neon)

1. Create a Neon project and copy both connection strings. Use the **direct** (non-pooled) one for migrations.
2. Apply the schema and the seed:

   ```bash
   psql "$DATABASE_URL_UNPOOLED" -v ON_ERROR_STOP=1 \
     -f db/migrations/V1__schema.sql \
     -f db/migrations/V2__seed_mock_data.sql
   ```

3. Try it:

   ```sql
   SELECT full_name, plan_name, used_to_date, remaining_maximum, days_remaining, benefits_expiring_soon
   FROM v_enrollment_benefit_summary;
   ```

Schema highlights:

- **Enumerations are `TEXT + CHECK`, not PG enums**, so JPA maps them with `@Enumerated(EnumType.STRING)`. Money is `NUMERIC(10,2)`, which maps to `BigDecimal`.
- **Coverage model:**
  - `plan_coverage_tiers` holds the classic 100/80/50 coinsurance tiers.
  - `cdt_procedures.default_coverage_class` sets each procedure's default tier.
  - `plan_procedure_overrides` handles exclusions and reclassifications (e.g. "implants excluded on Core PPO").
- **`procedure_fees`** stores both the negotiated in-network fee and the UCR fee, which powers the in- vs out-of-network comparison.
- **Views:**
  - `v_plan_procedure_coverage` resolves coverage for every plan × procedure × region. This is ready-made context for Bedrock prompts.
  - `v_enrollment_benefit_summary` gives used, planned and remaining maximum, deductible progress, days left and the `benefits_expiring_soon` flag. This drives the progress bar.
- **Spring Boot:** the files use Flyway naming. Point Flyway at them with `spring.flyway.locations=filesystem:../db/migrations`.

## Backend (Spring Boot + Bedrock)

Java API under `backend/`. This is the shared foundation; business logic
(procedure extraction, pricing, recommendations, RAG, etc.) is built on top of it.

- **Java 21** (required). The build targets Java 21 even if a newer JDK is your default.
- **Spring Boot 3.5.x**, Maven, base package `com.codelinc.dental`.
- **Amazon Bedrock** via AWS SDK for Java v2 (Converse API), model
  `us.amazon.nova-2-lite-v1:0` in region `us-east-2`.
- Region and model ID are centralized in `application.yml` / `AwsBedrockProperties`,
  not hardcoded across the code.

### Package layout

```
com.codelinc.dental
├── config        AwsBedrockProperties, BedrockConfig (client bean), CorsConfig
├── controller    HealthController, AiTestController
├── dto           AiTestRequest, AiTestResponse, ErrorResponse
├── model         (empty — JPA entities land here once the Neon schema is final)
├── repository    (empty — Spring Data repositories go here)
├── service       AiService, BedrockAiService (Converse API)
└── exception     AiServiceException, GlobalExceptionHandler
```

JPA and the Postgres driver are on the classpath but **no entities or tables are
defined** — the schema is owned by `db/migrations/`. Hibernate is set to
`ddl-auto: none` so it never creates, drops, or alters the database.

### Environment variables

Names only — see `backend/.env.example`. Never commit real values.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon JDBC URL, e.g. `jdbc:postgresql://<host>/<db>?sslmode=require` |
| `DATABASE_USERNAME` | Neon user |
| `DATABASE_PASSWORD` | Neon password |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API key; read by the AWS SDK credential chain |
| `BEDROCK_REGION` | defaults to `us-east-2` |
| `BEDROCK_MODEL_ID` | defaults to `us.amazon.nova-2-lite-v1:0` |
| `CORS_ALLOWED_ORIGINS` | defaults to `http://localhost:5173` (Vite dev server) |

The database layer is **opt-in** via the `db` Spring profile, so the API boots for
early development even before Neon is wired up:

- Without a database: `mvn spring-boot:run` (health + AI endpoints work).
- With Neon: set the `DATABASE_*` vars and run with `SPRING_PROFILES_ACTIVE=db`.

### Build and run

Use Java 21. If it isn't your default JDK, point `JAVA_HOME` at it:

```bash
cd backend
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64   # adjust to your Java 21 path

./mvnw -version        # (or: mvn -version) confirm it reports Java 21
mvn clean verify       # compile + run tests
mvn spring-boot:run    # start on http://localhost:8080
```

Bedrock auth comes from your shell. The AWS SDK automatically uses
`AWS_BEARER_TOKEN_BEDROCK` if it is exported:

```bash
export AWS_BEARER_TOKEN_BEDROCK="<your Bedrock API key>"
mvn spring-boot:run
```

### Test the endpoints

Health check:

```bash
curl http://localhost:8080/api/health
# {"status":"ok"}
```

Bedrock round-trip (temporary dev endpoint):

```bash
curl -X POST http://localhost:8080/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"message":"Respond with exactly: Java Bedrock integration works."}'
# {"response":"Java Bedrock integration works."}
```

If `AWS_BEARER_TOKEN_BEDROCK` is not available to the process, `/api/ai/test`
returns a clean `502` JSON error instead of a stack trace — the health endpoint
still works regardless.

## The 3D office

The rooms live in `frontend/src/components/3d/`, one file each: Entrance (storefront), Reception, Hallway, Operatory, Imaging, Consult office, Billing and Records. Each is a 6 × 5 × 3 m cutaway room built from `roomKit.jsx`. They have light oak floors, mint and sage walls with a maroon and orange rail, white doors with frosted glass, plants, art and clocks.

- **Nothing is downloaded.** Textures (oak, plaster, fabric, leather, brushed metal, cork, concrete, grass, signs, screens) are drawn on canvases in code, with bump and roughness maps. Porcelain, lamp shades and the tooth models use a clearcoat finish, and chrome uses brushed roughness. Contact shadows sit under the furniture.
- **`STOPS`:** each room lists one camera stop per page section, keyed by the `id` of the `<Panel>`, with the object to highlight. `view(target, distance, azimuth, elevation)` frames an object tightly. The lens is narrow (24°), and on wide screens the picture shifts right so the object sits beside the text.
- **Scroll:** the camera holds on a section's object for the first 70% of the section, with a slow orbit of up to 5°. It then glides to the next stop. Every move is damped (`THREE.MathUtils.damp`).
- **`DOORS`:** each room lists its doors (`wall`, `u`, plaque). On a route change the camera flies to the door to the next room. The door starts opening 200 ms before the camera gets there, and the camera passes through the doorway with a 0.01 near plane. It then comes in through the matching door of the next room, which closes behind it. With reduced motion this is a short cross-fade.
- **Stations:** `STATIONS` in `DentalOffice.jsx` names the eight places the demo stops: the desk, chair, X-ray, terminal, calendar, coin jar, network doors and cork board.
- **Preview one room:** `<RoomPreview Room={OperatoryRoom} stops={STOPS} />` from `roomKit.jsx`.

## Backend contract (to build next)

`POST /api/assistant/chat`, body `{ enrollmentId, message, toothNumber }`. It returns the `AssistantReply` shape from `src/lib/mockAssistant.ts`:

- `content`: the plain-English answer.
- `requests`: the CDT codes plus tooth numbers.
- `lineItems`: the priced estimates.
- `deferred`: care to book after the maximum resets (e.g. the crown after a root canal).
- `analysis`: the `AiAnalysis` card: `simplifiedExplanation`, `estimatedCost`, `inNetworkCost`, `outOfNetworkCost` and `suggestedSequence`.

Under the hood, Bedrock maps the free text to CDT codes using `cdt_procedures.common_aliases`. The service then prices the codes from `v_plan_procedure_coverage` and checks them against `v_enrollment_benefit_summary`.

## Demo script

1. **Entrance → Walk in → Reception.** Choose **Use the sample plan**: Maya's Lincoln Preferred PPO. The max bar shows $400 of $1,500 used.
2. **Operatory.** "Root canal on tooth #14" is already typed in, so choose **Price it**. The root canal costs you $232 in-network. The assistant adds the crown the tooth needs afterwards and books it for Jan 12: **"Do step 1 now and step 2 after Jan 1 to save $315."**
3. **Billing.** See what you pay, and that the $50 deductible isn't met yet. Switch to **Out-of-network** to compare.
4. **Consult office.** The timeline puts the root canal before Dec 31 and the crown after Jan 1. The table shows $1,284 if you do both this year, against $969 split.
5. **Records.** See the annual maximum (the coin jar in 3D) and claims, then **Add to my calendar (.ics)**.
6. **Ask AI** (bottom right in every room): *"Can I get another cleaning this year?"*
7. Switch the header to **Traditional** to show the same pages with no 3D.
