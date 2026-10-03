# Molarity: AI Dental Benefits Optimizer

Codelinc Hackathon 2026. Describe the dental care you need in plain language, and Molarity:

1. **Interprets it**: maps "crown on my back left molar" to CDT `D2740` on tooth #19.
2. **Translates the plan jargon**: shows what insurance pays and what you pay, in and out of network.
3. **Sequences the care**: spreads treatment across plan years so the annual maximum gets used and nothing expires unused.

| Layer | Tech |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| 3D | Three.js via React Three Fiber v9 + drei |
| Backend (next) | Java / Spring Boot |
| Database | Neon (serverless Postgres) |
| AI | Amazon Bedrock |

## Repository layout

```
db/migrations/
  V1__schema.sql            tables + views (Flyway naming)
  V2__seed_mock_data.sql    3 fictional plans, 28 CDT codes, 3 demo users
frontend/
  src/App.tsx               state hub: 3D selection <-> chat <-> breakdown <-> progress bar
  src/components/
    three/                  ALL Three.js code lives here (lazy-loaded chunk)
      DentalScene.tsx       Canvas, camera, lights, OrbitControls, arch layout
      ToothPlaceholder.tsx  one clickable tooth, the swap point for real models
      archLayout.ts         parabolic arch math (Universal numbering 1-32)
    AnnualMaxProgress.tsx   used / planned / unused meter + expiring-benefits flag
    ToothStage.tsx          3D stage card + overlays
    ToothInspector.tsx      selected-tooth panel with quick "what would it cost" actions
    sidebar/                AI chat, cost breakdown, plan-language translation
  src/lib/estimate.ts       coinsurance / deductible / annual-max estimator
  src/lib/mockAssistant.ts  offline stand-in for the Bedrock endpoint
  src/data/mockData.ts      demo user data that mirrors the SQL seed
```

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

## Swapping in a real tooth model

Only `frontend/src/components/three/ToothPlaceholder.tsx` changes:

- Keep its outer `<group>`, which owns placement, hover/click events and the animation.
- Replace `<PlaceholderShape>` with meshes from `useGLTF('/models/teeth.glb')`.
- Local frame: biting surface at `y = 0`, crown toward `+y`, cheek side toward `+z`. Lower teeth are flipped automatically.

`DentalScene` exposes the props `selectedTooth`, `onToothSelect`, `onToothHover` and `toothStatus`. Nothing outside `components/three/` imports Three.js.

## Backend contract (to build next)

`POST /api/assistant/chat`, body `{ enrollmentId, message, toothNumber }`. It returns the `AssistantReply` shape from `src/lib/mockAssistant.ts`:

- `content`: the plain-English answer.
- `requests`: the CDT codes plus tooth numbers.
- `lineItems`: the priced estimates.

Under the hood, Bedrock maps the free text to CDT codes using `cdt_procedures.common_aliases`. The service then prices the codes from `v_plan_procedure_coverage` and checks them against `v_enrollment_benefit_summary`.

## Demo script

1. The progress bar shows Maya has **$1,004 left**, with **$303 that would expire unused** even after her planned crown and filling.
2. Click **tooth #3**, then **Crown**. The plan goes over the maximum, and the assistant suggests moving part of the work past Jan 1.
3. Ask **"Can I get another cleaning this year?"** Both 2026 cleanings are used, so it recommends early January, when a cleaning is covered at 100%.
4. Open **Cost breakdown** and toggle **Out-of-network** to compare costs. Scroll to **Your plan, decoded** for the jargon translations.
