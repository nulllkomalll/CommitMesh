/**
 * REAL integration test: actual Express app + real MongoDB Atlas transactions.
 * Run:  npm run test:concurrency   (requires MONGODB_URI_TEST in .env)
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

const testUri = process.env.MONGODB_URI_TEST;
if (!testUri) { console.error('MONGODB_URI_TEST is not set.'); process.exit(1); }
if (testUri === process.env.MONGODB_URI) { console.error('Refusing to run: MONGODB_URI_TEST equals MONGODB_URI.'); process.exit(1); }
const dbName = new URL(testUri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.replace('/', '');
if (!/test/i.test(dbName)) { console.error(`Refusing to run: test DB name "${dbName}" must contain "test".`); process.exit(1); }
process.env.MONGODB_URI = testUri; // must happen before the app/config is imported

type Json = Record<string, any>;
let base = '';
async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Json };
}

async function newPlan(budgetCents: number) {
  const r = await call('POST', '/plans', { name: `test-${Date.now()}`, budgetCents, currency: 'USD' });
  assert.equal(r.status, 201);
  return r.json.plan.id as string;
}
async function newProposal(planId: string, agentType: string, merchant: string, amountCents: number) {
  const r = await call('POST', `/plans/${planId}/proposals`, {
    agentType, merchant, description: `${merchant} item ${Math.random()}`, amountCents, priority: 'medium',
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.proposal.id as string;
}

async function main() {
  const { connectDb, disconnectDb } = await import('../src/config/db');
  const { app } = await import('../src/app');
  const { Commitment } = await import('../src/models/Commitment');
  await connectDb();
  const server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    // --- Scenario 1: $900 budget, two $600 reservations at once ---
    for (let round = 1; round <= 5; round++) {
      const planId = await newPlan(90000);
      const [travel, shopping] = await Promise.all([
        newProposal(planId, 'TRAVEL', 'SkyJet', 60000),
        newProposal(planId, 'SHOPPING', 'Hamilton', 60000),
      ]);
      const results = await Promise.all([
        call('POST', `/proposals/${travel}/reserve`),
        call('POST', `/proposals/${shopping}/reserve`),
      ]);
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [201, 409], `round ${round}: got ${JSON.stringify(results.map((r) => [r.status, r.json.error?.code]))}`);
      const loser = results.find((r) => r.status === 409)!;
      assert.equal(loser.json.error.code, 'BUDGET_EXCEEDED');

      const plan = (await call('GET', `/plans/${planId}`)).json.plan;
      assert.equal(plan.reservedCents, 60000);
      assert.equal(plan.availableCents, 30000);
      assert.equal(await Commitment.countDocuments({ planId }), 1);
      console.log(`round ${round}: OK (winner: ${results[0].status === 201 ? 'TRAVEL' : 'SHOPPING'})`);
    }

    // --- Scenario 2: same proposal reserved twice concurrently ---
    const planId = await newPlan(100000);
    const prop = await newProposal(planId, 'EVENTS', 'Harbor Hall', 10000);
    const dup = await Promise.all([call('POST', `/proposals/${prop}/reserve`), call('POST', `/proposals/${prop}/reserve`)]);
    assert.deepEqual(dup.map((r) => r.status).sort(), [201, 409]);
    assert.equal((await call('GET', `/plans/${planId}`)).json.plan.reservedCents, 10000);
    assert.equal(await Commitment.countDocuments({ proposalId: prop }), 1);
    console.log('duplicate-reservation: OK');

    // --- Scenario 3: release exactly once, even concurrently ---
    const commitmentId = dup.find((r) => r.status === 201)!.json.commitment.id as string;
    const rel = await Promise.all([call('POST', `/commitments/${commitmentId}/release`), call('POST', `/commitments/${commitmentId}/release`)]);
    assert.deepEqual(rel.map((r) => r.status).sort(), [200, 409]);
    const after = (await call('GET', `/plans/${planId}`)).json.plan;
    assert.equal(after.reservedCents, 0);
    assert.equal(after.availableCents, 100000);
    console.log('release-once: OK');

    // --- Scenario 4: ledger reflects events ---
    const ledger = (await call('GET', `/plans/${planId}/ledger`)).json;
    assert.deepEqual(ledger.entries.map((e: Json) => e.type), ['RELEASE', 'RESERVATION', 'PROPOSAL_SUBMITTED']);
    console.log('ledger: OK');

    console.log('\nALL CONCURRENCY TESTS PASSED against', dbName);
  } finally {
    server.close();
    await disconnectDb();
  }
}

main().catch((e) => { console.error('TEST FAILED:', e); process.exit(1); });
