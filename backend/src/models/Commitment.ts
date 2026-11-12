
import { Schema, model, Types } from 'mongoose';

export const COMMITMENT_STATUSES = ['RESERVED', 'RELEASED', 'PAID'] as const;

export const PAYMENT_STATUSES = [
  'NONE',
  'ORDER_CREATED',
  'CAPTURING',
  'CAPTURED',
] as const;

const commitmentSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },

    // A proposal can only ever have one commitment.
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, unique: true },

    amountCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },

    status: {
      type: String,
      enum: COMMITMENT_STATUSES,
      default: 'RESERVED',
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'NONE',
      required: true,
    },

    paypalOrderId: { type: String, trim: true },
paypalApprovalUrl: { type: String, trim: true },
paypalCaptureId: { type: String, trim: true },

    releasedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

// Prevent one PayPal order or capture from being attached to multiple commitments.
commitmentSchema.index({ paypalOrderId: 1 }, { unique: true, sparse: true });
commitmentSchema.index({ paypalCaptureId: 1 }, { unique: true, sparse: true });

export interface CommitmentDoc {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  proposalId: Types.ObjectId;
  amountCents: number;
  status: (typeof COMMITMENT_STATUSES)[number];
  paymentStatus: (typeof PAYMENT_STATUSES)[number];
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalApprovalUrl?: string;
  releasedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const Commitment = model('Commitment', commitmentSchema);
