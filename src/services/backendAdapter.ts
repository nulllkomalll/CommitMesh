
import type { CommitMeshApi } from './api';
import type {
  Agent,
  AgentId,
  AnalysisResult,
  CreatePlanInput,
  LedgerEntry,
  LedgerEventType,
  Priority,
  Proposal,
  ProposalStatus,
  SharedPlan,
  SimulationInput,
  SimulationResult,
  Snapshot,
  SubmitProposalInput,
  UpdateBudgetInput,
} from '../types';

import { runConflictSimulation as runLocalSimulation } from './simulation';
import { computeSummary } from './budget';
import { ApiError } from '../utils/errors';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '');
const PLAN_STORAGE_KEY = 'commitmesh.backend.planId.v1';

type ApiAgent = 'TRAVEL' | 'SHOPPING' | 'EVENTS';

interface BackendPlan {
  id: string;
  name: string;
  currency: 'USD';
  budgetCents: number;
  priorities: {
    TRAVEL?: Priority;
    SHOPPING?: Priority;
    EVENTS?: Priority;
  };
  createdAt: string;
}

interface BackendProposal {
  id: string;
  planId: string;
  agentType: ApiAgent;
  merchant: string;
  description: string;
  amountCents: number;
  priority: Priority;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BackendLedgerEntry {
  id: string;
  type: string;
  proposalId: string;
  commitmentId: string | null;
  agentType: ApiAgent;
  merchant: string;
  amountCents: number;
  timestamp: string;
  balanceAfterCents: number;
}

const agentToApi: Record<AgentId, ApiAgent> = {
  travel: 'TRAVEL',
  shopping: 'SHOPPING',
  events: 'EVENTS',
};

const agentFromApi: Record<ApiAgent, AgentId> = {
  TRAVEL: 'travel',
  SHOPPING: 'shopping',
  EVENTS: 'events',
};

const statusFromApi: Record<string, ProposalStatus> = {
  PROPOSED: 'Proposed',
  RESERVED: 'Reserved',
  BLOCKED: 'Blocked',
  PAID: 'Paid',
  RELEASED: 'Released',
};

const ledgerTypeFromApi: Record<string, LedgerEventType> = {
  PROPOSAL_SUBMITTED: 'Proposal submitted',
  RESERVATION: 'Reservation',
  RESERVATION_BLOCKED: 'Reservation blocked',
  RELEASE: 'Release',
  PAYMENT: 'Payment',
};

const DEFAULT_PLAN: CreatePlanInput = {
  name: 'Lisbon Offsite Ã¢â‚¬â€ Shared Budget',
  currency: 'USD',
  totalBudget: 900,
  agentPriorities: {
    travel: 'high',
    shopping: 'medium',
    events: 'low',
  },
};

const DEFAULT_PROPOSALS: SubmitProposalInput[] = [
  {
    agentId: 'travel',
    merchant: 'SkyJet Airlines',
    description: 'Round-trip flights for 4 Ã¢â‚¬â€ Lisbon team offsite',
    amount: 700,
    priority: 'high',
  },
  {
    agentId: 'shopping',
    merchant: 'Hamilton Supply Co.',
    description: 'Team welcome kits and printed materials',
    amount: 120,
    priority: 'medium',
  },
  {
    agentId: 'events',
    merchant: 'Harbor Hall Venues',
    description: 'Venue hire and catering deposit',
    amount: 150,
    priority: 'low',
  },
];

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(
      'Cannot connect to CommitMesh backend. Check that the backend server is running.',
    );
  }

  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const payload = data as {
      error?: { message?: string };
    };

    throw new ApiError(
      payload.error?.message ?? `Backend request failed (${response.status}).`,
    );
  }

  return data as T;
}

function mapPlan(dto: BackendPlan): SharedPlan {
  return {
    id: dto.id,
    name: dto.name,
    currency: dto.currency,
    totalBudget: dto.budgetCents / 100,
    agentPriorities: {
      travel: dto.priorities?.TRAVEL ?? 'high',
      shopping: dto.priorities?.SHOPPING ?? 'medium',
      events: dto.priorities?.EVENTS ?? 'low',
    },
    createdAt: dto.createdAt,
  };
}

function mapProposal(dto: BackendProposal): Proposal {
  return {
    id: dto.id,
    agentId: agentFromApi[dto.agentType],
    merchant: dto.merchant,
    description: dto.description,
    amount: dto.amountCents / 100,
    priority: dto.priority,
    status: statusFromApi[dto.status] ?? 'Proposed',
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function mapLedger(
  dto: BackendLedgerEntry,
  proposalStatus: ProposalStatus,
): LedgerEntry {
  return {
    id: dto.id,
    proposalId: dto.proposalId,
    agentId: agentFromApi[dto.agentType],
    merchant: dto.merchant,
    type: ledgerTypeFromApi[dto.type] ?? 'Proposal submitted',
    amount: dto.amountCents / 100,
    status: proposalStatus,
    timestamp: dto.timestamp,
    balanceAfter: dto.balanceAfterCents / 100,
  };
}

function createAgents(createdAt: string): Agent[] {
  return [
    {
      id: 'travel',
      name: 'Travel Agent',
      role: 'Books flights, lodging and ground transport',
      active: true,
      registeredAt: createdAt,
    },
    {
      id: 'shopping',
      name: 'Shopping Agent',
      role: 'Procures goods, supplies and merchandise',
      active: true,
      registeredAt: createdAt,
    },
    {
      id: 'events',
      name: 'Events Agent',
      role: 'Reserves venues, catering and activities',
      active: true,
      registeredAt: createdAt,
    },
  ];
}

export class BackendAdapter implements CommitMeshApi {
  private async createRemotePlan(input: CreatePlanInput): Promise<BackendPlan> {
    if (input.currency !== 'USD') {
      throw new ApiError('The backend currently supports USD only.');
    }

    const result = await request<{ plan: BackendPlan }>('/plans', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        currency: 'USD',
        budgetCents: Math.round(input.totalBudget * 100),
        priorities: {
          TRAVEL: input.agentPriorities.travel,
          SHOPPING: input.agentPriorities.shopping,
          EVENTS: input.agentPriorities.events,
        },
      }),
    });

    localStorage.setItem(PLAN_STORAGE_KEY, result.plan.id);
    return result.plan;
  }

  private async getOrCreatePlanId(): Promise<string> {
    let planId = localStorage.getItem(PLAN_STORAGE_KEY);

    if (!planId) {
      const plan = await this.createRemotePlan(DEFAULT_PLAN);
      planId = plan.id;
      await this.seedDefaultProposals(planId);
    }

    return planId;
  }

  private async seedDefaultProposals(planId: string): Promise<void> {
    for (const proposal of DEFAULT_PROPOSALS) {
      await request(`/plans/${planId}/proposals`, {
        method: 'POST',
        body: JSON.stringify({
          agentType: agentToApi[proposal.agentId],
          merchant: proposal.merchant,
          description: proposal.description,
          amountCents: Math.round(proposal.amount * 100),
          priority: proposal.priority,
        }),
      });
    }
  }

  private async loadSnapshot(planId: string): Promise<Snapshot> {
    const [planResult, proposalResult, ledgerResult] = await Promise.all([
      request<{ plan: BackendPlan }>(`/plans/${planId}`),
      request<{ proposals: BackendProposal[] }>(
        `/plans/${planId}/proposals`,
      ),
      request<{ entries: BackendLedgerEntry[] }>(
        `/plans/${planId}/ledger`,
      ),
    ]);

    const plan = mapPlan(planResult.plan);
    const proposals = proposalResult.proposals.map(mapProposal);

    const statusById = new Map(
      proposals.map((proposal) => [proposal.id, proposal.status]),
    );

    const ledger = ledgerResult.entries.map((entry) =>
      mapLedger(
        entry,
        statusById.get(entry.proposalId) ?? 'Proposed',
      ),
    );

    const agents = createAgents(plan.createdAt);

    return {
      plan,
      agents,
      proposals,
      ledger,
      integrations: [
        {
          id: 'gemini',
          name: 'Gemini',
          description: 'AI-assisted conflict analysis and recommendations.',
          connected: false,
          detail: 'Not connected. Analysis currently uses a local heuristic.',
        },
        {
          id: 'paypal-sandbox',
          name: 'PayPal Sandbox',
          description: 'Payment authorisation and settlement (sandbox only).',
          connected: false,
          detail: 'Not connected yet. PayPal checkout is not implemented.',
        },
      ],
      summary: computeSummary(plan, proposals),
    };
  }

  async getSnapshot(): Promise<Snapshot> {
    const planId = await this.getOrCreatePlanId();
    return this.loadSnapshot(planId);
  }

  async createPlan(input: CreatePlanInput): Promise<Snapshot> {
    const plan = await this.createRemotePlan(input);
    return this.loadSnapshot(plan.id);
  }

  async updateBudget(input: UpdateBudgetInput): Promise<Snapshot> {
    void input;
    throw new ApiError(
      'Budget editing is not connected to the backend yet.',
    );
  }

  async submitProposal(input: SubmitProposalInput): Promise<Snapshot> {
    const planId = await this.getOrCreatePlanId();

    await request(`/plans/${planId}/proposals`, {
      method: 'POST',
      body: JSON.stringify({
        agentType: agentToApi[input.agentId],
        merchant: input.merchant,
        description: input.description,
        amountCents: Math.round(input.amount * 100),
        priority: input.priority,
      }),
    });

    return this.loadSnapshot(planId);
  }

  async requestReservation(proposalId: string): Promise<Snapshot> {
    const planId = await this.getOrCreatePlanId();

    await request(`/proposals/${proposalId}/reserve`, {
      method: 'POST',
    });

    return this.loadSnapshot(planId);
  }

  async requestRelease(proposalId: string): Promise<Snapshot> {
    const planId = await this.getOrCreatePlanId();

    const result = await request<{ entries: BackendLedgerEntry[] }>(
      `/plans/${planId}/ledger`,
    );

    const reservation = result.entries.find(
      (entry) =>
        entry.proposalId === proposalId &&
        entry.type === 'RESERVATION' &&
        entry.commitmentId,
    );

    if (!reservation?.commitmentId) {
      throw new ApiError(
        'Could not find an active reservation for this proposal.',
      );
    }

    await request(`/commitments/${reservation.commitmentId}/release`, {
      method: 'POST',
    });

    return this.loadSnapshot(planId);
  }

    async createPayPalOrder(
    proposalId: string,
  ): Promise<{ approvalUrl: string }> {
    const planId = await this.getOrCreatePlanId();

    const result = await request<{ entries: BackendLedgerEntry[] }>(
      `/plans/${planId}/ledger`,
    );

    const reservation = result.entries.find(
      (entry) =>
        entry.proposalId === proposalId &&
        entry.type === 'RESERVATION' &&
        entry.commitmentId,
    );

    if (!reservation?.commitmentId) {
      throw new ApiError(
        'Could not find an active reservation for this proposal.',
      );
    }

    return request<{ approvalUrl: string }>(
      `/commitments/${reservation.commitmentId}/paypal/order`,
      { method: 'POST' },
    );
  }

  async capturePayPalPayment(commitmentId: string): Promise<Snapshot> {
    const planId = await this.getOrCreatePlanId();

    await request(
      `/commitments/${commitmentId}/paypal/capture`,
      { method: 'POST' },
    );

    return this.loadSnapshot(planId);
  }

  async analyzePlan(): Promise<AnalysisResult> {
    const planId = await this.getOrCreatePlanId();

    const result = await request<{ analysis: AnalysisResult }>(
      `/plans/${planId}/analyze`,
      { method: 'POST' },
    );

    return result.analysis;
  }

  async runConflictSimulation(
    input: SimulationInput,
  ): Promise<SimulationResult> {
    return runLocalSimulation(input);
  }

  async resetDemoData(): Promise<Snapshot> {
    const plan = await this.createRemotePlan(DEFAULT_PLAN);
    await this.seedDefaultProposals(plan.id);
    return this.loadSnapshot(plan.id);
  }
}

export const backendAdapter = new BackendAdapter();
