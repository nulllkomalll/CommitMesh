
import mongoose from 'mongoose';

import { Commitment, CommitmentDoc } from '../models/Commitment';
import { Plan, PlanDoc } from '../models/Plan';
import { Proposal, ProposalDoc } from '../models/Proposal';

import { AppError, notFound } from '../utils/errors';

import {
  commitmentDto,
  planDto,
  proposalDto,
} from './serializers';

import {
  createPayPalOrder,
  capturePayPalOrder,
} from './paypalClient';

const TX_OPTIONS = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
} as const;

async function getPaidResult(commitmentId: string) {
  const commitment = await Commitment.findById(commitmentId)
    .lean<CommitmentDoc>();

  if (
    !commitment ||
    commitment.status !== 'PAID' ||
    commitment.paymentStatus !== 'CAPTURED'
  ) {
    return null;
  }

  const [plan, proposal] = await Promise.all([
    Plan.findById(commitment.planId).lean<PlanDoc>(),
    Proposal.findById(commitment.proposalId).lean<ProposalDoc>(),
  ]);

  if (!plan || !proposal) {
    throw new AppError(
      500,
      'PAYMENT_LEDGER_INCONSISTENT',
      'Payment was captured but its associated records could not be loaded.',
    );
  }

  return {
    commitment: commitmentDto(commitment),
    proposal: proposalDto(proposal),
    plan: planDto(plan),
  };
}

/**
 * Create a PayPal checkout order for an existing RESERVED commitment.
 * The amount and description come from MongoDB, not the frontend.
 */
export async function createOrderForCommitment(commitmentId: string) {
  const existing = await Commitment.findById(commitmentId)
    .lean<CommitmentDoc>();

  if (!existing) throw notFound('Commitment');

  if (existing.status !== 'RESERVED') {
    throw new AppError(
      409,
      'INVALID_COMMITMENT_STATE',
      'Only RESERVED commitments can enter PayPal checkout.',
    );
  }

  const paymentStatus = existing.paymentStatus ?? 'NONE';

  // Reuse an existing order instead of creating another one.
  if (paymentStatus === 'ORDER_CREATED') {
    if (!existing.paypalOrderId || !existing.paypalApprovalUrl) {
      throw new AppError(
        409,
        'PAYPAL_ORDER_INCOMPLETE',
        'The existing PayPal order is missing its approval details.',
      );
    }

    return {
      commitment: commitmentDto(existing),
      approvalUrl: existing.paypalApprovalUrl,
    };
  }

  if (paymentStatus !== 'NONE') {
    throw new AppError(
      409,
      'INVALID_PAYMENT_STATE',
      'This commitment already has a payment operation in progress or completed.',
    );
  }

  const proposal = await Proposal.findById(existing.proposalId)
    .lean<ProposalDoc>();

  if (!proposal) throw notFound('Proposal');

  if (
    proposal.status !== 'RESERVED' ||
    proposal.amountCents !== existing.amountCents
  ) {
    throw new AppError(
      409,
      'COMMITMENT_MISMATCH',
      'The reserved commitment does not match its proposal.',
    );
  }

  const order = await createPayPalOrder({
    commitmentId: String(existing._id),
    amountCents: existing.amountCents,
    description: `${proposal.merchant}: ${proposal.description}`,
  });

  // Only attach the order if the commitment is still RESERVED
  // and no other request has already attached an order.
  const updated = await Commitment.findOneAndUpdate(
    {
      _id: commitmentId,
      status: 'RESERVED',
      $or: [
        { paymentStatus: 'NONE' },
        { paymentStatus: { $exists: false } },
      ],
    },
    {
      $set: {
        paymentStatus: 'ORDER_CREATED',
        paypalOrderId: order.orderId,
        paypalApprovalUrl: order.approvalUrl,
      },
    },
    { new: true },
  ).lean<CommitmentDoc>();

  if (updated) {
    return {
      commitment: commitmentDto(updated),
      approvalUrl: order.approvalUrl,
    };
  }

  // A concurrent request may have attached the same idempotent order.
  const latest = await Commitment.findById(commitmentId)
    .lean<CommitmentDoc>();

  if (
    latest?.status === 'RESERVED' &&
    latest.paymentStatus === 'ORDER_CREATED' &&
    latest.paypalOrderId === order.orderId &&
    latest.paypalApprovalUrl
  ) {
    return {
      commitment: commitmentDto(latest),
      approvalUrl: latest.paypalApprovalUrl,
    };
  }

  throw new AppError(
    409,
    'COMMITMENT_CHANGED',
    'The commitment changed while creating the PayPal order. Please refresh and try again.',
  );
}

/**
 * Capture a buyer-approved PayPal order.
 *
 * PayPal capture happens first. MongoDB then atomically moves the
 * commitment from RESERVED to PAID and transfers its amount from
 * reservedCents to paidCents.
 *
 * A retry uses the same PayPal idempotency key.
 */
export async function capturePaymentForCommitment(commitmentId: string) {
  const existing = await Commitment.findById(commitmentId)
    .lean<CommitmentDoc>();

  if (!existing) throw notFound('Commitment');

  // Make repeated requests safe after successful capture.
  if (
    existing.status === 'PAID' &&
    existing.paymentStatus === 'CAPTURED'
  ) {
    const result = await getPaidResult(commitmentId);

    if (result) return result;
  }

  if (existing.status !== 'RESERVED') {
    throw new AppError(
      409,
      'INVALID_COMMITMENT_STATE',
      'Only RESERVED commitments can be captured.',
    );
  }

  const paymentStatus = existing.paymentStatus ?? 'NONE';

  if (
    paymentStatus !== 'ORDER_CREATED' &&
    paymentStatus !== 'CAPTURING'
  ) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_STATE',
      'Create a PayPal order and obtain buyer approval before capture.',
    );
  }

  if (!existing.paypalOrderId) {
    throw new AppError(
      409,
      'PAYPAL_ORDER_MISSING',
      'No PayPal order is attached to this commitment.',
    );
  }

  // Claim the capture operation. A retry is allowed when the
  // previous attempt already moved the record to CAPTURING.
  if (paymentStatus === 'ORDER_CREATED') {
    const claim = await Commitment.updateOne(
      {
        _id: commitmentId,
        status: 'RESERVED',
        paymentStatus: 'ORDER_CREATED',
        paypalOrderId: existing.paypalOrderId,
      },
      {
        $set: { paymentStatus: 'CAPTURING' },
      },
    );

    if (claim.modifiedCount === 0) {
      const latest = await Commitment.findById(commitmentId)
        .lean<CommitmentDoc>();

      if (
        latest?.status === 'PAID' &&
        latest.paymentStatus === 'CAPTURED'
      ) {
        const result = await getPaidResult(commitmentId);
        if (result) return result;
      }

      if (
        latest?.status !== 'RESERVED' ||
        latest.paymentStatus !== 'CAPTURING'
      ) {
        throw new AppError(
          409,
          'PAYMENT_STATE_CHANGED',
          'The payment state changed. Please refresh and try again.',
        );
      }
    }
  }

  // Retry-safe: paypalClient uses a stable idempotency key.
  const paypalResult = await capturePayPalOrder(
    existing.paypalOrderId,
    commitmentId,
  );

  if (paypalResult.id !== existing.paypalOrderId) {
    throw new AppError(
      502,
      'PAYPAL_ORDER_MISMATCH',
      'PayPal returned a different order than the one requested.',
    );
  }

  const capture = paypalResult.purchase_units?.[0]?.payments?.captures?.[0];

  if (
    paypalResult.status !== 'COMPLETED' ||
    capture?.status !== 'COMPLETED' ||
    !capture.id
  ) {
    throw new AppError(
      409,
      'PAYPAL_CAPTURE_NOT_COMPLETED',
      'PayPal has not confirmed a completed capture. Retry or check the payment status.',
    );
  }

  const expectedAmount = (existing.amountCents / 100).toFixed(2);

  if (
    capture.amount?.currency_code !== 'USD' ||
    capture.amount?.value !== expectedAmount
  ) {
    throw new AppError(
      502,
      'PAYPAL_AMOUNT_MISMATCH',
      'The captured currency or amount does not match the reserved commitment.',
    );
  }

  const session = await mongoose.startSession();

  try {
    let out:
      | {
          commitment: CommitmentDoc;
          plan: PlanDoc;
          proposal: ProposalDoc;
        }
      | undefined;

    const paidAt = new Date();

    await session.withTransaction(async () => {
      const commitment = await Commitment.findOneAndUpdate(
        {
          _id: commitmentId,
          status: 'RESERVED',
          paymentStatus: 'CAPTURING',
          paypalOrderId: existing.paypalOrderId,
          amountCents: existing.amountCents,
        },
        {
          $set: {
            status: 'PAID',
            paymentStatus: 'CAPTURED',
            paypalCaptureId: capture.id,
            paidAt,
          },
        },
        { new: true, session },
      ).lean<CommitmentDoc>();

      if (!commitment) {
        throw new AppError(
          409,
          'PAYMENT_STATE_CHANGED',
          'The commitment could not be finalized.',
        );
      }

      const plan = await Plan.findOneAndUpdate(
        {
          _id: commitment.planId,
          reservedCents: { $gte: commitment.amountCents },
        },
        {
          $inc: {
            reservedCents: -commitment.amountCents,
            paidCents: commitment.amountCents,
          },
        },
        { new: true, session },
      ).lean<PlanDoc>();

      if (!plan) {
        throw new AppError(
          500,
          'LEDGER_INCONSISTENT',
          'The plan reserved total is lower than the commitment.',
        );
      }

      const proposal = await Proposal.findOneAndUpdate(
        {
          _id: commitment.proposalId,
          status: 'RESERVED',
        },
        {
          $set: { status: 'PAID' },
        },
        { new: true, session },
      ).lean<ProposalDoc>();

      if (!proposal) {
        throw new AppError(
          500,
          'LEDGER_INCONSISTENT',
          'The associated proposal could not be marked as paid.',
        );
      }

      out = { commitment, plan, proposal };
    }, TX_OPTIONS);

    if (!out) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'Payment transaction produced no result.',
      );
    }

    return {
      commitment: commitmentDto(out.commitment),
      proposal: proposalDto(out.proposal),
      plan: planDto(out.plan),
    };
  } catch (err) {
    // Another concurrent request may have completed the same capture.
    const completed = await getPaidResult(commitmentId);
    if (completed) return completed;

    throw err;
  } finally {
    await session.endSession();
  }
}
