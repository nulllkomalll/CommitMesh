
import { Proposal, ProposalDoc } from '../models/Proposal';
import { Commitment, CommitmentDoc } from '../models/Commitment';
import { getPlanOrThrow } from './planService';
import { planDto } from './serializers';

type EventType =
  | 'PROPOSAL_SUBMITTED'
  | 'RESERVATION'
  | 'RELEASE'
  | 'PAYMENT';

const ORDER: Record<EventType, number> = {
  PROPOSAL_SUBMITTED: 0,
  RESERVATION: 1,
  RELEASE: 2,
  PAYMENT: 3,
};

/** Ledger is derived from proposals + commitments (the source of truth), newest first. */
export async function getLedger(planId: string) {
  const plan = await getPlanOrThrow(planId);

  const [proposals, commitments] = await Promise.all([
    Proposal.find({ planId }).lean<ProposalDoc[]>(),
    Commitment.find({ planId }).lean<CommitmentDoc[]>(),
  ]);

  const byId = new Map(proposals.map((p) => [String(p._id), p]));

  interface Ev {
    type: EventType;
    at: Date;
    proposal: ProposalDoc;
    commitmentId?: string;
    amountCents: number;
  }

  const events: Ev[] = [];

  for (const p of proposals) {
    events.push({
      type: 'PROPOSAL_SUBMITTED',
      at: p.createdAt,
      proposal: p,
      amountCents: p.amountCents,
    });
  }

  for (const c of commitments) {
    const p = byId.get(String(c.proposalId));
    if (!p) continue;

    events.push({
      type: 'RESERVATION',
      at: c.createdAt,
      proposal: p,
      commitmentId: String(c._id),
      amountCents: c.amountCents,
    });

    if (c.releasedAt) {
      events.push({
        type: 'RELEASE',
        at: c.releasedAt,
        proposal: p,
        commitmentId: String(c._id),
        amountCents: c.amountCents,
      });
    }

    if (c.paidAt) {
      events.push({
        type: 'PAYMENT',
        at: c.paidAt,
        proposal: p,
        commitmentId: String(c._id),
        amountCents: c.amountCents,
      });
    }
  }

  events.sort(
    (a, b) =>
      a.at.getTime() - b.at.getTime() ||
      ORDER[a.type] - ORDER[b.type],
  );

  let available = plan.budgetCents;

  const entries = events.map((e, i) => {
    // Reservation reduces available funds.
    if (e.type === 'RESERVATION') {
      available -= e.amountCents;
    }

    // Release restores available funds.
    if (e.type === 'RELEASE') {
      available += e.amountCents;
    }

    // Payment does not change available funds:
    // the money was already committed at reservation time.
    return {
      id: `${e.type}:${e.commitmentId ?? e.proposal._id}:${i}`,
      type: e.type,
      proposalId: String(e.proposal._id),
      commitmentId: e.commitmentId ?? null,
      agentType: e.proposal.agentType,
      merchant: e.proposal.merchant,
      amountCents: e.amountCents,
      timestamp: e.at,
      balanceAfterCents: available,
    };
  });

  return {
    plan: planDto(plan),
    entries: entries.reverse(),
  };
}
