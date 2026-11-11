import type { CoreState, LedgerEntry, Proposal } from '../types';

/**
 * Demo seed data. Edit freely — the mock adapter reads this once and the UI
 * contains no knowledge of these values.
 *
 * Scenario: $900 shared budget, $970 requested ($70 over).
 */
export function createSeedState(now: number = Date.now()): CoreState {
  const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

  const proposals: Proposal[] = [
    {
      id: 'prop_travel_01',
      agentId: 'travel',
      merchant: 'SkyJet Airlines',
      description: 'Round-trip flights for 4 — Lisbon team offsite',
      amount: 700,
      priority: 'high',
      status: 'Proposed',
      createdAt: minutesAgo(42),
      updatedAt: minutesAgo(42),
    },
    {
      id: 'prop_shopping_01',
      agentId: 'shopping',
      merchant: 'Hamilton Supply Co.',
      description: 'Team welcome kits and printed materials',
      amount: 120,
      priority: 'medium',
      status: 'Proposed',
      createdAt: minutesAgo(31),
      updatedAt: minutesAgo(31),
    },
    {
      id: 'prop_events_01',
      agentId: 'events',
      merchant: 'Harbor Hall Venues',
      description: 'Venue hire and catering deposit',
      amount: 150,
      priority: 'low',
      status: 'Proposed',
      createdAt: minutesAgo(18),
      updatedAt: minutesAgo(18),
    },
  ];

  const totalBudget = 900;

  // Newest first.
  const ledger: LedgerEntry[] = [...proposals]
    .reverse()
    .map((p) => ({
      id: `led_${p.id}`,
      proposalId: p.id,
      agentId: p.agentId,
      merchant: p.merchant,
      type: 'Proposal submitted',
      amount: p.amount,
      status: p.status,
      timestamp: p.createdAt,
      balanceAfter: totalBudget,
    }));

  return {
    plan: {
      id: 'plan_demo',
      name: 'Lisbon Offsite — Shared Budget',
      currency: 'USD',
      totalBudget,
      agentPriorities: { travel: 'high', shopping: 'medium', events: 'low' },
      createdAt: minutesAgo(60),
    },
    agents: [
      {
        id: 'travel',
        name: 'Travel Agent',
        role: 'Books flights, lodging and ground transport',
        active: true,
        registeredAt: minutesAgo(60 * 24 * 14),
      },
      {
        id: 'shopping',
        name: 'Shopping Agent',
        role: 'Procures goods, supplies and merchandise',
        active: true,
        registeredAt: minutesAgo(60 * 24 * 14),
      },
      {
        id: 'events',
        name: 'Events Agent',
        role: 'Reserves venues, catering and activities',
        active: true,
        registeredAt: minutesAgo(60 * 24 * 10),
      },
    ],
    proposals,
    ledger,
    integrations: [
      {
        id: 'gemini',
        name: 'Gemini',
        description: 'AI-assisted conflict analysis and recommendations.',
        connected: false,
        detail: 'Not connected. Analysis currently runs on a local mock heuristic.',
      },
      {
        id: 'paypal-sandbox',
        name: 'PayPal Sandbox',
        description: 'Payment authorisation and settlement (sandbox only).',
        connected: false,
        detail: 'Placeholder. Payments will be authorised by the backend once it is connected.',
      },
    ],
  };
}
