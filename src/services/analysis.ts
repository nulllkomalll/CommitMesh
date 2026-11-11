import { PRIORITY_RANK } from '../data/constants';
import type {
  Agent,
  AnalysisResult,
  BudgetConflict,
  BudgetSummary,
  DuplicateGroup,
  Proposal,
  Recommendation,
  SharedPlan,
} from '../types';
import { formatMoney } from '../utils/format';
import { LIVE_STATUSES } from './budget';

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Mock "AI" analysis. A transparent heuristic stands in for Gemini until the
 * backend is connected: fund by priority, flag duplicates, defer what does not fit.
 */
export function analyzePlan(
  plan: SharedPlan,
  agents: Agent[],
  proposals: Proposal[],
  summary: BudgetSummary,
  now: Date = new Date(),
): AnalysisResult {
  const money = (n: number) => formatMoney(n, plan.currency);
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  const live = proposals.filter((p) => LIVE_STATUSES.includes(p.status));
  const pending = live.filter((p) => p.status === 'Proposed');

  /* ---- Duplicates: several live proposals with the same merchant ---- */
  const byMerchant = new Map<string, Proposal[]>();
  for (const p of live) {
    const key = normalise(p.merchant);
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), p]);
  }

  const duplicates: DuplicateGroup[] = [];
  const duplicateRejects = new Map<string, Proposal>(); // rejected id -> proposal kept
  for (const [key, items] of byMerchant) {
    if (items.length < 2) continue;
    const ordered = [...items].sort((a, b) => {
      const aCommitted = a.status === 'Proposed' ? 1 : 0;
      const bCommitted = b.status === 'Proposed' ? 1 : 0;
      return aCommitted - bCommitted || a.createdAt.localeCompare(b.createdAt);
    });
    const [kept, ...rest] = ordered;
    duplicates.push({
      id: `dup_${key}`,
      reason: `${items.length} proposals target ${kept.merchant}. Keeping ${agentName(kept.agentId)}'s earlier request.`,
      items: items.map((p) => ({
        proposalId: p.id,
        agentId: p.agentId,
        merchant: p.merchant,
        amount: p.amount,
      })),
    });
    for (const p of rest) {
      if (p.status === 'Proposed') duplicateRejects.set(p.id, kept);
    }
  }

  /* ---- Fund pending proposals by priority, then by submission time ---- */
  const ranked = pending
    .filter((p) => !duplicateRejects.has(p.id))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
        a.createdAt.localeCompare(b.createdAt),
    );

  let remaining = summary.available;
  const recommendations: Recommendation[] = [];

  const toRec = (
    p: Proposal,
    action: Recommendation['action'],
    reason: string,
  ): Recommendation => ({
    proposalId: p.id,
    agentId: p.agentId,
    merchant: p.merchant,
    amount: p.amount,
    priority: p.priority,
    action,
    reason,
  });

  for (const p of ranked) {
    if (p.amount > plan.totalBudget) {
      recommendations.push(
        toRec(p, 'Reject', `Exceeds the entire shared budget of ${money(plan.totalBudget)}.`),
      );
    } else if (p.amount <= remaining) {
      remaining -= p.amount;
      recommendations.push(
        toRec(p, 'Approve', `Fits within the budget at ${p.priority} priority. ${money(remaining)} left after approval.`),
      );
    } else {
      recommendations.push(
        toRec(
          p,
          'Defer',
          `Only ${money(remaining)} would remain after higher-priority proposals. Revisit if budget increases or funds are released.`,
        ),
      );
    }
  }

  for (const p of pending) {
    const kept = duplicateRejects.get(p.id);
    if (kept) {
      recommendations.push(
        toRec(p, 'Reject', `Duplicate of ${agentName(kept.agentId)}'s request to ${kept.merchant}.`),
      );
    }
  }

  /* ---- Conflicts ---- */
  const conflicts: BudgetConflict[] = [];
  if (summary.pendingTotal > summary.available) {
    conflicts.push({
      id: 'conflict_budget',
      severity: 'high',
      title: 'Pending proposals exceed available budget',
      detail: `Agents are requesting ${money(summary.pendingTotal)} against ${money(summary.available)} available — over by ${money(summary.pendingTotal - summary.available)}.`,
    });
  }
  for (const r of recommendations) {
    if (r.action === 'Defer') {
      conflicts.push({
        id: `conflict_${r.proposalId}`,
        severity: 'medium',
        title: `${agentName(r.agentId)} cannot be funded alongside higher-priority requests`,
        detail: `${r.merchant} (${money(r.amount)}, ${r.priority} priority) does not fit in the remaining budget.`,
      });
    }
    if (r.action === 'Reject' && r.reason.startsWith('Exceeds')) {
      conflicts.push({
        id: `conflict_${r.proposalId}`,
        severity: 'high',
        title: `${agentName(r.agentId)} request exceeds the total budget`,
        detail: `${r.merchant} requests ${money(r.amount)} but the plan total is ${money(plan.totalBudget)}.`,
      });
    }
  }

  const totalFor = (action: Recommendation['action']) =>
    recommendations.filter((r) => r.action === action).reduce((t, r) => t + r.amount, 0);
  const count = (action: Recommendation['action']) =>
    recommendations.filter((r) => r.action === action).length;

  const approvedTotal = totalFor('Approve');

  let summaryText: string;
  if (pending.length === 0) {
    summaryText = 'No proposals are awaiting a decision.';
  } else if (conflicts.length === 0 && duplicates.length === 0) {
    summaryText = `All ${pending.length} pending proposals fit within the available budget.`;
  } else {
    summaryText = `Approve ${count('Approve')}, defer ${count('Defer')}, reject ${count('Reject')}. Approved proposals total ${money(approvedTotal)}, leaving ${money(remaining)} unallocated.`;
  }

  return {
    generatedAt: now.toISOString(),
    engine: 'Mock heuristic engine (Gemini not connected)',
    currency: plan.currency,
    summary: summaryText,
    conflicts,
    duplicates,
    recommendations,
    approvedTotal,
    deferredTotal: totalFor('Defer'),
    rejectedTotal: totalFor('Reject'),
    remainingAfter: remaining,
    disclaimer:
      'AI recommendation only — this is not payment authorization. Reservations and payments are authorised solely by the backend.',
  };
}
