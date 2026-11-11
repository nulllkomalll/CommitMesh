import type { PlanDoc } from '../models/Plan';
import type { ProposalDoc } from '../models/Proposal';
import type { CommitmentDoc } from '../models/Commitment';

export const planDto = (p: PlanDoc) => ({
  id: String(p._id),
  name: p.name,
  currency: p.currency,
  budgetCents: p.budgetCents,
  reservedCents: p.reservedCents,
  paidCents: p.paidCents,
  availableCents: p.budgetCents - p.reservedCents - p.paidCents,
  priorities: p.priorities,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export const proposalDto = (p: ProposalDoc) => ({
  id: String(p._id),
  planId: String(p.planId),
  agentType: p.agentType,
  merchant: p.merchant,
  description: p.description,
  amountCents: p.amountCents,
  priority: p.priority,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export const commitmentDto = (c: CommitmentDoc) => ({
  id: String(c._id),
  planId: String(c.planId),
  proposalId: String(c.proposalId),
  amountCents: c.amountCents,
  status: c.status,
  releasedAt: c.releasedAt ?? null,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});
