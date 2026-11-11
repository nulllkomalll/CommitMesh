import { Schema, model, InferSchemaType } from 'mongoose';

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export const AGENT_TYPES = ['TRAVEL', 'SHOPPING', 'EVENTS'] as const;

const planSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    budgetCents: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    currency: { type: String, enum: ['USD'], default: 'USD', required: true },
    reservedCents: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    paidCents: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    priorities: {
      TRAVEL: { type: String, enum: PRIORITIES, default: 'high' },
      SHOPPING: { type: String, enum: PRIORITIES, default: 'medium' },
      EVENTS: { type: String, enum: PRIORITIES, default: 'low' },
    },
  },
  { timestamps: true },
);

export type PlanDoc = InferSchemaType<typeof planSchema> & { _id: import('mongoose').Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Plan = model('Plan', planSchema);
