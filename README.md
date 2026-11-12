# CommitMesh

### The shared financial coordination layer for AI agents.

**Individually intelligent agents. One financially coherent plan.**

CommitMesh is a multi-agent financial coordination platform that helps independent AI agents coordinate proposals against a shared budget. It uses Google Gemini to analyze competing proposals, identify conflicts and duplicates, and recommend priorities, while deterministic backend logic enforces budget limits and controls reservations.

PayPal Sandbox provides a buyer-approved checkout and payment-capture integration.

## Live Demo

- **Frontend:** https://commitmesh-frontend.onrender.com
- **Backend Health:** https://commitmesh.onrender.com/api/health
- **Hosting:** Render

## The Problem

Independent AI agents can make individually reasonable purchasing decisions while collectively exceeding a shared budget.

For example, three agents may independently request:

- Travel: $700
- Shopping: $120
- Events: $150

Total requested: **$970**

Shared budget: **$900**

Without coordination, independently generated proposals can result in conflicting purchases and overspending.

## The Solution

CommitMesh introduces a shared financial coordination layer.

It allows multiple agent proposal sources to submit requests against one shared budget. Gemini analyzes the proposals and provides recommendations, while the backend independently validates and enforces every financial operation.

## Key Features

### 1. Multi-Agent Proposal Coordination
- Travel, Shopping, and Events proposal categories.
- Individual proposal amounts and priorities.
- Shared budget visibility.
- Centralized proposal management.

### 2. Gemini AI Analysis
- AI-generated plan summaries.
- Semantic conflict detection.
- Duplicate proposal identification.
- Approve, defer, or reject recommendations.
- Explanations for individual recommendations.

Gemini is advisory only. Its output is validated, and deterministic backend safeguards prevent recommendations from exceeding the available budget.

### 3. Deterministic Budget Enforcement
- Financial calculations use integer cents.
- Backend-controlled reservations.
- Atomic budget updates.
- Protection against concurrent overspending.
- Duplicate reservation prevention.
- Safe reservation release.

### 4. Commitment Ledger
The ledger records:
- Proposal submissions.
- Reservations.
- Releases.
- Payments.

It provides timestamps, proposal information, transaction amounts, and resulting balances.

### 5. PayPal Sandbox Integration
- Server-side PayPal authentication.
- Sandbox order creation.
- Buyer approval through PayPal checkout.
- Server-side payment capture.
- Idempotency protection for retries.
- Payment status reflected in the application and ledger.

**Important:** The application uses PayPal Sandbox by default. Internal reservations are accounting commitments, not PayPal fund holds. Sandbox transactions do not represent real-money payments.

## Architecture

```text
                  CommitMesh Frontend
                 React + TypeScript
                          |
                          | HTTP / REST
                          |
                  Express Backend
                          |
              +-----------+-----------+
              |           |           |
          MongoDB       Gemini      PayPal
          Atlas          API       Sandbox
              |           |           |
          Financial    Advisory    Checkout
          Authority    Analysis    & Capture
              |
         Shared Budget
              |
        Commitment Ledger
```

### Architecture Principles

**Backend owns financial authority.**

The frontend requests operations and displays backend-confirmed results. It does not independently authorize reservations or payments.

**Gemini provides recommendations, not authorization.**

AI-generated output is validated against the actual proposal records. A deterministic budget guard prevents recommendations from approving more than the remaining available budget.

**Reservations are enforced atomically.**

Concurrent requests cannot independently consume the same available budget.

**Payments are separate from reservations.**

The backend creates a PayPal order, waits for buyer approval, and captures the payment server-side. A successful capture transitions the commitment and proposal to their paid states.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript |
| Build tooling | Vite |
| Styling | CSS |
| Icons | Lucide React |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas, Mongoose |
| AI | Google Gemini API (`@google/genai`) |
| Payment | PayPal Checkout REST API (Sandbox) |
| Validation | Zod |
| Testing | TypeScript, tsx |

## Project Structure

```text
CommitMesh/
|
+-- src/
|   +-- components/       Reusable UI components
|   +-- pages/            Application screens
|   +-- layouts/          Application layout
|   +-- context/          Shared application state
|   +-- services/         API contracts and adapters
|   +-- data/             Frontend demo data
|   +-- types/            Shared frontend types
|   +-- styles/           CSS and design tokens
|
+-- backend/
|   +-- src/
|   |   +-- config/       Environment and database config
|   |   +-- controllers/  HTTP request handlers
|   |   +-- models/       MongoDB models
|   |   +-- routes/       API routes
|   |   +-- services/     Business logic, Gemini, PayPal
|   |   +-- utils/        Shared utilities
|   |
|   +-- tests/            Backend tests
|   +-- scripts/          Database utilities
|   +-- .env.example
|
+-- README.md
+-- LICENSE
+-- .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18 or newer.
- npm.
- MongoDB Atlas or another MongoDB deployment supporting transactions.
- Google Gemini API key for AI analysis.
- PayPal Developer Sandbox application credentials for checkout testing.

### 1. Clone the repository

```bash
git clone https://github.com/nulllkomalll/CommitMesh.git
cd CommitMesh
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and configure the required MongoDB connection string.

Add Gemini and PayPal credentials if you want to use those integrations.

### 3. Start the backend

From the `backend` directory:

```bash
npm run dev
```

The API runs at:

`http://localhost:4000/api`

Health check:

`http://localhost:4000/api/health`

### 4. Start the frontend

Open another terminal:

```bash
cd ..
npm install
npm run dev
```

Open the Vite URL:

`http://localhost:5173`

## Environment Configuration

All backend environment variables belong in `backend/.env`.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Required MongoDB connection |
| `MONGODB_URI_TEST` | Separate database for concurrency tests |
| `PORT` | Backend port; defaults to `4000` |
| `CORS_ORIGIN` | Allowed frontend origins |
| `NODE_ENV` | Runtime environment |
| `GEMINI_API_KEY` | Optional Gemini API key |
| `GEMINI_MODEL` | Gemini model; defaults to `gemini-3.8-flash` |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox application client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox application secret |
| `PAYPAL_BASE_URL` | PayPal API base URL; defaults to Sandbox |
| `FRONTEND_URL` | Frontend URL used for PayPal return and cancellation |

Never commit actual `.env` files or expose API credentials.

## API Overview

All endpoints are prefixed with `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API and database health |
| POST | `/plans` | Create a shared plan |
| GET | `/plans/:planId` | Retrieve a plan |
| POST | `/plans/:planId/analyze` | Run Gemini analysis |
| POST | `/plans/:planId/proposals` | Submit a proposal |
| GET | `/plans/:planId/proposals` | List proposals |
| GET | `/plans/:planId/ledger` | Retrieve commitment ledger |
| POST | `/proposals/:proposalId/reserve` | Reserve budget |
| POST | `/commitments/:commitmentId/release` | Release a reservation |
| POST | `/commitments/:commitmentId/paypal/order` | Create a PayPal order |
| POST | `/commitments/:commitmentId/paypal/capture` | Capture an approved payment |

## Running Checks

### Frontend

From the repository root:

```bash
npm run typecheck
npm run build
```

### Backend

From the `backend` directory:

```bash
npm run typecheck
npm run build
npm run test:unit
npm run test:concurrency
```

The concurrency tests use a separate test database. Configure `MONGODB_URI_TEST` with a database name containing `test`. Never point the test runner at your production database.

## Example Demo Scenario

A shared budget of $900 receives three proposals:

| Agent | Proposal | Amount | Priority |
|---|---|---:|---|
| Travel | Flight and travel expenses | $700 | High |
| Shopping | Supplies | $120 | Medium |
| Events | Venue expenses | $150 | Low |
| **Total** | | **$970** | |

The requests exceed the shared budget by $70.

Gemini analyzes the proposals and recommends a resolution. The backend independently enforces the actual available budget.

The concurrency scenario also demonstrates two simultaneous $600 reservation requests against a $900 budget. Only one reservation can succeed.

## Security and Financial Integrity

- API credentials stay on the backend.
- Gemini-generated recommendations are never treated as payment authorization.
- Financial amounts are stored and calculated in integer cents.
- Backend operations enforce budget constraints.
- MongoDB transactions protect related financial state changes.
- PayPal capture is performed server-side.
- PayPal requests use stable idempotency keys.
- Sandbox checkout is intended for testing, not real-money transactions.

## Project Scope

CommitMesh is a focused prototype demonstrating shared-budget coordination for multiple agent proposal sources.

The current scope is one shared USD-denominated plan with Travel, Shopping, and Events proposal categories.

It does not claim to provide autonomous merchant purchasing, real-world escrow, bank-account integration, or production payment processing.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
