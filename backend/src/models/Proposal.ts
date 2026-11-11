import { Schema, model, Types } from 'mongoose';
import { AGENT_TYPES, PRIORITIES } from './Plan';

export const PROPOSAL_STATUSES = ['PROPOSED', 'RESERVED', 'BLOCKED', 'RELEASED', 'PAID'] as const;

const proposalSchema = new Schema(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    agentType: { type: String, enum: AGENT_TYPES, required: true },
    merchant: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amountCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    priority: { type: String, enum: PRIORITIES, required: true },
    status: { type: String, enum: PROPOSAL_STATUSES, default: 'PROPOSED', required: true },
    fingerprint: { type: String, required: true },
  },
  { timestamps: true },
);
proposalSchema.index({ planId: 1, fingerprint: 1 });

export interface ProposalDoc {
  _id: Types.ObjectId;
  planId: Types.ObjectId;
  agentType: (typeof AGENT_TYPES)[number];
  merchant: string;
  description: string;
  amountCents: number;
  priority: (typeof PRIORITIES)[number];
  status: (typeof PROPOSAL_STATUSES)[number];
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}
export const Proposal = model('Proposal', proposalSchema);
