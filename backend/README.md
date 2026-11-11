# CommitMesh Backend

Express + TypeScript + Mongoose API for CommitMesh. Phase 1: real plans, proposals, MongoDB persistence,
**atomic reservations** and concurrency protection. A reservation is an internal accounting commitment —
not a PayPal hold. No Gemini, no PayPal, no payment endpoints yet.

## 1. Connect MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com (Atlas clusters are replica sets, so transactions work).
2. Database Access → add a user with read/write. Network Access → allow your IP.
3. Connect → Drivers → copy the `mongodb+srv://…` string.
4. `cp .env.example .env` and fill in:
   - `MONGODB_URI` → `.../commitmesh?...`
   - `MONGODB_URI_TEST` → a **different** database, e.g. `.../commitmesh_test?...` (name must contain `test`).

## 2. Run
```bash
cd backend
npm install
npm run check:db      # verifies replica set / transactions
npm run build         # tsc
npm run dev           # http://localhost:4000/api/health   (or: npm start after build)
```
The Vite frontend (http://localhost:5173) is allowed via `CORS_ORIGIN`.

## 3. Concurrency test (real Atlas, real transactions)
```bash
npm run test:unit         # fingerprint tests, no DB needed
npm run test:concurrency  # uses MONGODB_URI_TEST only
```
It runs, 5×, two $600 reservations against a $900 plan with `Promise.all` and asserts exactly one 201 and one
409 `BUDGET_EXCEEDED`, `reservedCents = 60000`, available `30000`, one commitment. It also checks double-reserve
of one proposal and double-release of one commitment. It refuses to run if the DB name lacks "test".

## How the reservation engine works
One transaction: (1) claim proposal `PROPOSED|BLOCKED → RESERVED`; (2) single `findOneAndUpdate` on the plan with
filter `reservedCents + paidCents + amount <= budgetCents` and `$inc reservedCents`; (3) insert commitment
(unique index on `proposalId`). Concurrent requests collide on the plan document; the loser is retried by
`withTransaction` and then fails the guard → `409 BUDGET_EXCEEDED`. The amount is read from the stored proposal;
request bodies on `/reserve` are ignored. All money is integer cents.

## Endpoints
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | |
| POST | `/api/plans` | `{"name":"Lisbon Offsite","budgetCents":90000,"currency":"USD","priorities":{"TRAVEL":"high","SHOPPING":"medium","EVENTS":"low"}}` → 201 |
| GET | `/api/plans/:planId` | includes `availableCents` |
| POST | `/api/plans/:planId/proposals` | `{"agentType":"TRAVEL","merchant":"SkyJet Airlines","description":"Round-trip flights for 4","amountCents":70000,"priority":"high"}` → 201 `{proposal, duplicateWarnings[]}` |
| GET | `/api/plans/:planId/proposals` | |
| POST | `/api/proposals/:proposalId/reserve` | no body. 201, or 409 `BUDGET_EXCEEDED` / `INVALID_PROPOSAL_STATE` / `ALREADY_RESERVED` |
| POST | `/api/commitments/:commitmentId/release` | 200, or 409 `INVALID_COMMITMENT_STATE` |
| GET | `/api/plans/:planId/ledger` | newest first, with `balanceAfterCents` |

Errors: `{"error":{"code":"…","message":"…","details":…}}` (400 validation, 404, 409, 500).

## Frontend compatibility notes
The frontend currently uses a mock adapter with dollars, Title-case statuses (`Reserved`) and lowercase agent ids
(`travel`). This API uses integer cents, UPPERCASE statuses and `TRAVEL|SHOPPING|EVENTS` as specified. Wiring
the UI means writing an HTTP `CommitMeshApi` adapter that converts at the boundary (÷100, case mapping).
