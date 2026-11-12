import mongoose from 'mongoose';
import { Plan, PlanDoc } from '../models/Plan';
import { Proposal, ProposalDoc } from '../models/Proposal';
import { Commitment, CommitmentDoc } from '../models/Commitment';
import { AppError, notFound } from '../utils/errors';
import { logger } from '../utils/logger';
import { commitmentDto, planDto, proposalDto } from './serializers';

const RESERVABLE = ['PROPOSED', 'BLOCKED'] as const; // BLOCKED may be retried after budget frees up

// withTransaction() automatically retries TransientTransactionError (e.g. WriteConflict
// when two agents hit the same plan document) and UnknownTransactionCommitResult.
const TX_OPTIONS = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
} as const;

/**
 * Atomic reservation. Every write happens in ONE transaction:
 *   1. claim the proposal  (PROPOSED|BLOCKED -> RESERVED)   [conditional update]
 *   2. reserve on the plan (conditional update guarded by
 *        reservedCents + paidCents + amount <= budgetCents) [conditional update]
 *   3. insert the commitment (unique index on proposalId)
 * The budget check and the increment are a single atomic findOneAndUpdate, so there
 * is no read-then-write window. Concurrent reservations on the same plan collide on
 * the plan document; MongoDB aborts the loser with a write conflict and the driver
 * retries it against the updated state, where the guard then fails with BUDGET_EXCEEDED.
 * The amount is always read from the stored proposal, never from the client.
 */
export async function reserveProposal(proposalId: string) {
  const existing = await Proposal.findById(proposalId).lean<ProposalDoc>();
  if (!existing) throw notFound('Proposal');
  if (!(RESERVABLE as readonly string[]).includes(existing.status)) {
    throw new AppError(409, 'INVALID_PROPOSAL_STATE', `A ${existing.status} proposal cannot be reserved.`, {
      status: existing.status,
    });
  }

  const session = await mongoose.startSession();
  try {
    let out: { plan: PlanDoc; proposal: ProposalDoc; commitment: CommitmentDoc } | undefined;

    await session.withTransaction(async () => {
      const proposal = await Proposal.findOneAndUpdate(
        { _id: proposalId, status: { $in: RESERVABLE } },
        { $set: { status: 'RESERVED' } },
        { new: true, session },
      ).lean<ProposalDoc>();
      if (!proposal) {
        throw new AppError(409, 'INVALID_PROPOSAL_STATE', 'Proposal is no longer reservable (already reserved or changed).');
      }

      const amount = proposal.amountCents;
      const plan = await Plan.findOneAndUpdate(
        {
          _id: proposal.planId,
          $expr: { $lte: [{ $add: ['$reservedCents', '$paidCents', amount] }, '$budgetCents'] },
        },
        { $inc: { reservedCents: amount } },
        { new: true, session },
      ).lean<PlanDoc>();
      if (!plan) throw new AppError(409, 'BUDGET_EXCEEDED', 'Insufficient remaining budget for this reservation.');

      const [commitment] = await Commitment.create(
        [{ planId: proposal.planId, proposalId: proposal._id, amountCents: amount, status: 'RESERVED' }],
        { session },
      );
      out = { plan, proposal, commitment: commitment.toObject() as unknown as CommitmentDoc };
    }, TX_OPTIONS);

    if (!out) throw new AppError(500, 'INTERNAL_ERROR', 'Reservation transaction produced no result.');
    logger.info(`Reserved ${out.commitment.amountCents}c for proposal ${proposalId}`);
    return { commitment: commitmentDto(out.commitment), proposal: proposalDto(out.proposal), plan: planDto(out.plan) };
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw new AppError(409, 'ALREADY_RESERVED', 'This proposal already has a commitment.');
    }
    if (err instanceof AppError && err.code === 'BUDGET_EXCEEDED') {
      // Transaction aborted -> nothing changed. Mark the proposal BLOCKED (outside the txn) and report availability.
      await Proposal.updateOne({ _id: proposalId, status: 'PROPOSED' }, { $set: { status: 'BLOCKED' } });
      const plan = await Plan.findById(existing.planId).lean<PlanDoc>();
      const availableCents = plan ? plan.budgetCents - plan.reservedCents - plan.paidCents : 0;
      logger.warn(`Reservation blocked for proposal ${proposalId}: requested ${existing.amountCents}c, available ${availableCents}c`);
      throw new AppError(409, 'BUDGET_EXCEEDED', err.message, {
        requestedCents: existing.amountCents,
        availableCents,
      });
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

/** Release a RESERVED commitment: atomic, and impossible to apply twice. */
export async function releaseCommitment(commitmentId: string) {
  const existing = await Commitment.findById(commitmentId).lean<CommitmentDoc>();
  if (!existing) throw notFound('Commitment');

  const session = await mongoose.startSession();
  try {
    let out: { plan: PlanDoc; commitment: CommitmentDoc; proposal: ProposalDoc | null } | undefined;

    await session.withTransaction(async () => {
      const commitment = await Commitment.findOneAndUpdate(
        {
  _id: commitmentId,
  status: 'RESERVED',
  $or: [
    { paymentStatus: 'NONE' },
    { paymentStatus: { $exists: false } },
  ],
},
        { $set: { status: 'RELEASED', releasedAt: new Date() } },
        { new: true, session },
      ).lean<CommitmentDoc>();
      if (!commitment) {
        throw new AppError(409, 'INVALID_COMMITMENT_STATE', 'Only a RESERVED commitment can be released.');
      }

      const plan = await Plan.findOneAndUpdate(
        { _id: commitment.planId, reservedCents: { $gte: commitment.amountCents } },
        { $inc: { reservedCents: -commitment.amountCents } },
        { new: true, session },
      ).lean<PlanDoc>();
      if (!plan) throw new AppError(500, 'LEDGER_INCONSISTENT', 'Plan reserved total is lower than the commitment.');

      const proposal = await Proposal.findOneAndUpdate(
        { _id: commitment.proposalId, status: 'RESERVED' },
        { $set: { status: 'RELEASED' } },
        { new: true, session },
      ).lean<ProposalDoc>();
      out = { plan, commitment, proposal };
    }, TX_OPTIONS);

    if (!out) throw new AppError(500, 'INTERNAL_ERROR', 'Release transaction produced no result.');
    logger.info(`Released ${out.commitment.amountCents}c for commitment ${commitmentId}`);
    return {
      commitment: commitmentDto(out.commitment),
      proposal: out.proposal ? proposalDto(out.proposal) : null,
      plan: planDto(out.plan),
    };
  } finally {
    await session.endSession();
  }
}
