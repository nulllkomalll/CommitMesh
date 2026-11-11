import { Schema, model, Types } from 'mongoose';

export const COMMITMENT_STATUSES = ['RESERVED', 'RELEASED', 'PAID'] as const;

const commitmentSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    // UNIQUE: a proposal can only ever have one commitment (hard stop on double reservation).
    proposalId: { type: Schema.Types.ObjectId, ref: 'Proposal', required: true, unique: true },
    amountCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    status: { type: String, enum: COMMITMENT_STATUSES, default: 'RESERVED', required: true },
    releasedAt: { type: Date },
  },
  { timestamps: true },
);

export interface CommitmentDoc {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  proposalId: Types.ObjectId;
  amountCents: number;
  status: (typeof COMMITMENT_STATUSES)[number];
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
export const Commitment = model('Commitment', commitmentSchema);
