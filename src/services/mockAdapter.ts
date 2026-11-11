import { createSeedState } from '../data/seed';
import type {
  AnalysisResult,
  CoreState,
  CreatePlanInput,
  LedgerEntry,
  LedgerEventType,
  Proposal,
  SimulationInput,
  SimulationResult,
  Snapshot,
  SubmitProposalInput,
  UpdateBudgetInput,
} from '../types';
import { ApiError } from '../utils/errors';
import { formatMoney } from '../utils/format';
import { analyzePlan } from './analysis';
import type { CommitMeshApi } from './api';
import { computeSummary, evaluateReservation } from './budget';
import { runConflictSimulation } from './simulation';

const STORAGE_KEY = 'commitmesh.mock.state.v1';
const LATENCY_MS = 450;

const wait = (ms: number = LATENCY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function loadState(): CoreState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CoreState;
  } catch {
    /* storage unavailable or corrupt — fall back to seed */
  }
  return createSeedState();
}

/**
 * In-memory stand-in for the future Express backend. ALL state-changing logic
 * lives here so it can be deleted when a real adapter is wired in.
 * State is mirrored to localStorage purely so demos survive a page refresh.
 */
export class MockAdapter implements CommitMeshApi {
  private state: CoreState = loadState();

  /* ---------- helpers ---------- */

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* ignore */
    }
  }

  private snapshot(): Snapshot {
    return clone({
      ...this.state,
      summary: computeSummary(this.state.plan, this.state.proposals),
    });
  }

  private commit(): Snapshot {
    this.persist();
    return this.snapshot();
  }

  private findProposal(id: string): Proposal {
    const proposal = this.state.proposals.find((p) => p.id === id);
    if (!proposal) throw new ApiError('Proposal not found.');
    return proposal;
  }

  private logEvent(proposal: Proposal, type: LedgerEventType): void {
    const { available } = computeSummary(this.state.plan, this.state.proposals);
    const entry: LedgerEntry = {
      id: newId('led'),
      proposalId: proposal.id,
      agentId: proposal.agentId,
      merchant: proposal.merchant,
      type,
      amount: proposal.amount,
      status: proposal.status,
      timestamp: new Date().toISOString(),
      balanceAfter: available,
    };
    this.state.ledger.unshift(entry);
  }

  private assertBudgetCoversCommitments(totalBudget: number): void {
    const { reserved, paid } = computeSummary(this.state.plan, this.state.proposals);
    if (totalBudget < reserved + paid) {
      throw new ApiError(
        `Budget cannot be lower than the ${formatMoney(reserved + paid, this.state.plan.currency)} already reserved or paid.`,
      );
    }
  }

  /* ---------- reads ---------- */

  async getSnapshot(): Promise<Snapshot> {
    await wait();
    return this.snapshot();
  }

  /* ---------- plan ---------- */

  async createPlan(input: CreatePlanInput): Promise<Snapshot> {
    await wait();
    if (!input.name.trim()) throw new ApiError('Give the plan a name.');
    if (!(input.totalBudget > 0)) throw new ApiError('Total budget must be greater than zero.');
    this.assertBudgetCoversCommitments(input.totalBudget);

    this.state.plan = {
      id: newId('plan'),
      name: input.name.trim(),
      currency: input.currency,
      totalBudget: input.totalBudget,
      agentPriorities: { ...input.agentPriorities },
      createdAt: new Date().toISOString(),
    };
    return this.commit();
  }

  async updateBudget(input: UpdateBudgetInput): Promise<Snapshot> {
    await wait();
    if (!(input.totalBudget > 0)) throw new ApiError('Total budget must be greater than zero.');
    this.assertBudgetCoversCommitments(input.totalBudget);
    this.state.plan.totalBudget = input.totalBudget;
    this.state.plan.currency = input.currency;
    return this.commit();
  }

  /* ---------- proposals ---------- */

  async submitProposal(input: SubmitProposalInput): Promise<Snapshot> {
    await wait();
    if (!input.merchant.trim()) throw new ApiError('Merchant is required.');
    if (!input.description.trim()) throw new ApiError('Item description is required.');
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ApiError('Amount must be greater than zero.');
    }
    const agent = this.state.agents.find((a) => a.id === input.agentId);
    if (!agent || !agent.active) throw new ApiError('That agent is not registered or is inactive.');

    const now = new Date().toISOString();
    const proposal: Proposal = {
      id: newId('prop'),
      agentId: input.agentId,
      merchant: input.merchant.trim(),
      description: input.description.trim(),
      amount: Math.round(input.amount * 100) / 100,
      priority: input.priority,
      status: 'Proposed',
      createdAt: now,
      updatedAt: now,
    };
    this.state.proposals.push(proposal);
    this.logEvent(proposal, 'Proposal submitted');
    return this.commit();
  }

  async requestReservation(proposalId: string): Promise<Snapshot> {
    await wait();
    const proposal = this.findProposal(proposalId);
    if (proposal.status !== 'Proposed' && proposal.status !== 'Blocked') {
      throw new ApiError(`A ${proposal.status.toLowerCase()} proposal cannot be reserved.`);
    }

    const { available } = computeSummary(this.state.plan, this.state.proposals);
    const decision = evaluateReservation(available, proposal.amount);

    proposal.updatedAt = new Date().toISOString();
    if (decision.granted) {
      proposal.status = 'Reserved';
      proposal.statusNote = undefined;
      this.logEvent(proposal, 'Reservation');
    } else {
      proposal.status = 'Blocked';
      proposal.statusNote = `Only ${formatMoney(available, this.state.plan.currency)} was available.`;
      this.logEvent(proposal, 'Reservation blocked');
    }
    return this.commit();
  }

  async requestRelease(proposalId: string): Promise<Snapshot> {
    await wait();
    const proposal = this.findProposal(proposalId);
    if (proposal.status === 'Paid') throw new ApiError('Paid proposals cannot be released.');
    if (proposal.status === 'Released') throw new ApiError('This proposal is already released.');

    proposal.status = 'Released';
    proposal.statusNote = undefined;
    proposal.updatedAt = new Date().toISOString();
    this.logEvent(proposal, 'Release');
    return this.commit();
  }

  /* ---------- analysis & simulation ---------- */

  async analyzePlan(): Promise<AnalysisResult> {
    await wait(900);
    const { plan, agents, proposals } = this.state;
    return clone(analyzePlan(plan, agents, proposals, computeSummary(plan, proposals)));
  }

  async runConflictSimulation(input: SimulationInput): Promise<SimulationResult> {
    await wait(700);
    // Deliberately does not touch this.state — it is an illustration only.
    return runConflictSimulation(input);
  }

  /* ---------- admin ---------- */

  async resetDemoData(): Promise<Snapshot> {
    await wait();
    this.state = createSeedState();
    return this.commit();
  }
}
