import { Proposal, ProposalDoc } from '../models/Proposal';
import { AppError } from '../utils/errors';
import { DUPLICATE_THRESHOLD, fingerprint, similarity } from '../utils/fingerprint';
import { getPlanOrThrow } from './planService';
import { proposalDto } from './serializers';

export interface CreateProposalInput {
  agentType: 'TRAVEL' | 'SHOPPING' | 'EVENTS';
  merchant: string;
  description: string;
  amountCents: number;
  priority: 'high' | 'medium' | 'low';
}

export async function createProposal(planId: string, input: CreateProposalInput) {
  await getPlanOrThrow(planId);
  const fp = fingerprint(input.merchant, input.description);
  if (!fp) throw new AppError(400, 'VALIDATION_ERROR', 'Merchant and description produce an empty item fingerprint.');

  // Warn about similar, still-relevant proposals in the SAME plan (released ones don't count).
  const existing = await Proposal.find({ planId, status: { $ne: 'RELEASED' } }).lean<ProposalDoc[]>();
  const duplicateWarnings = existing
    .map((p) => ({ p, score: similarity(fp, p.fingerprint) }))
    .filter(({ score }) => score >= DUPLICATE_THRESHOLD)
    .map(({ p, score }) => ({
      proposalId: String(p._id),
      agentType: p.agentType,
      merchant: p.merchant,
      description: p.description,
      amountCents: p.amountCents,
      status: p.status,
      similarity: Math.round(score * 100) / 100,
      reason: score === 1 ? 'Identical normalized merchant and item.' : 'Very similar normalized merchant and item.',
    }));

  const doc = await Proposal.create({ planId, ...input, fingerprint: fp });
  return { proposal: proposalDto(doc.toObject() as unknown as ProposalDoc), duplicateWarnings };
}

export async function listProposals(planId: string) {
  await getPlanOrThrow(planId);
  const docs = await Proposal.find({ planId }).sort({ createdAt: 1 }).lean<ProposalDoc[]>();
  return docs.map(proposalDto);
}
