# CommitMesh — Frontend (Sandbox)

Multi-agent financial coordination dashboard. React + Vite + TypeScript, plain CSS with variables, `lucide-react` icons. No other runtime dependencies.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

## What's in it

| Screen | Notes |
| --- | --- |
| Overview | Budget stats, usage bar, recent activity, agent status cards |
| Shared Plans | Create a plan (budget, currency, per-agent priorities), view remaining budget |
| Agent Proposals | Submit proposals per agent, reserve/release, **Analyze Plan** AI-recommendation panel |
| Commitment Ledger | Every event with timestamp, agent, merchant, amount, status, balance after |
| Conflict Simulator | Two agents request $600 of a $900 budget — clearly labelled a frontend demo |
| Settings | Budget config, registered agents, Gemini / PayPal Sandbox status (both Not Connected) |

Seed scenario: $900 budget, Travel $700 + Shopping $120 + Events $150 = $970 (over by $70). Analysis recommends approving Travel and Shopping and deferring Events — derived from priority rules in `services/analysis.ts`, not hardcoded in the UI.

## Architecture

```
src/
  components/   reusable UI (no business logic)
  pages/        one per sidebar section
  layouts/      AppLayout: sidebar + top bar (SANDBOX badge)
  context/      CommitMeshProvider — loading / error / pending state around the API
  services/     api.ts (contract) · mockAdapter.ts · budget.ts · analysis.ts · simulation.ts
  data/         seed.ts (demo data) · constants.ts
  types/        shared TypeScript types
  styles/       tokens.css (CSS variables) · base · layout · components · pages
```

- **`services/api.ts`** defines `CommitMeshApi`. All methods are async; mutations return the full updated snapshot, so the UI never recomputes balances or statuses.
- **`services/mockAdapter.ts`** implements it in memory (mirrored to `localStorage` so demos survive a refresh). All state-changing logic lives here and in the pure helpers beside it.
- **`services/index.ts`** is the single switch point: export a fetch-based adapter there to talk to the Express backend. No UI changes needed.
- Reservation and payment authority belong to the backend. The UI only *requests* a reservation or release and renders the resulting status.
- AI analysis is a local heuristic labelled "Mock heuristic engine (Gemini not connected)" and is always marked as *not payment authorization*.
- The simulator never touches real state and is labelled as a frontend demo, not a database transaction.
- No PayPal calls are made. PayPal Sandbox is a labelled placeholder.

## Suggested backend contract (for the later Express adapter)

```
GET    /snapshot
POST   /plan                     CreatePlanInput
PATCH  /plan/budget              UpdateBudgetInput
POST   /proposals                SubmitProposalInput
POST   /proposals/:id/reserve
POST   /proposals/:id/release
POST   /analysis                 -> AnalysisResult
POST   /simulations/conflict     SimulationInput -> SimulationResult
POST   /admin/reset
```

## Still to do

- Real Express backend (reservation locking, ledger persistence)
- Gemini analysis and PayPal Sandbox payment flow (the "Paid" status exists but nothing can set it yet)
- Automated tests
