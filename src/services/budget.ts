import type {
  AgentActivity,
  AgentId,
  AgentStats,
  BudgetSummary,
  Proposal,
  ProposalStatus,
  SharedPlan,
} from '../types';

/** Statuses that currently place demand on the shared budget. */
export const LIVE_STATUSES: ProposalStatus[] = ['Proposed', 'Reserved', 'Paid'];

const sum = (items: Proposal[]) => items.reduce((total, p) => total + p.amount, 0);

export function computeSummary(plan: SharedPlan, proposals: Proposal[]): BudgetSummary {
  const reserved = sum(proposals.filter((p) => p.status === 'Reserved'));
  const paid = sum(proposals.filter((p) => p.status === 'Paid'));
  const pendingTotal = sum(proposals.filter((p) => p.status === 'Proposed'));
  const totalRequested = reserved + paid + pendingTotal;
  return {
    currency: plan.currency,
    totalBudget: plan.totalBudget,
    reserved,
    paid,
    available: plan.totalBudget - reserved - paid,
    totalRequested,
    pendingTotal,
    overBy: Math.max(0, totalRequested - plan.totalBudget),
  };
}

export function getAgentStats(agentId: AgentId, proposals: Proposal[]): AgentStats {
  const mine = proposals.filter((p) => p.agentId === agentId);
  const live = mine.filter((p) => LIVE_STATUSES.includes(p.status));

  let activity: AgentActivity = 'Idle';
  if (mine.some((p) => p.status === 'Blocked')) activity = 'Blocked';
  else if (mine.some((p) => p.status === 'Proposed')) activity = 'Awaiting reservation';
  else if (mine.some((p) => p.status === 'Reserved')) activity = 'Reserved';
  else if (mine.some((p) => p.status === 'Paid')) activity = 'Paid';

  return {
    proposalCount: mine.length,
    requested: sum(live),
    reserved: sum(mine.filter((p) => p.status === 'Reserved')),
    paid: sum(mine.filter((p) => p.status === 'Paid')),
    activity,
  };
}

/**
 * Decide whether a reservation of `amount` fits in `available`.
 * Shared by the mock adapter and the conflict simulation.
 */
export function evaluateReservation(
  available: number,
  amount: number,
): { granted: boolean; reason: string } {
  if (amount <= available) {
    return { granted: true, reason: 'Sufficient available budget.' };
  }
  return { granted: false, reason: 'Insufficient available budget.' };
}
