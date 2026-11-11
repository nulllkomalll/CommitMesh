import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const priority = z.enum(['high', 'medium', 'low']);
const cents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const createPlanBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    budgetCents: cents,
    currency: z.literal('USD').default('USD'),
    priorities: z.object({ TRAVEL: priority, SHOPPING: priority, EVENTS: priority }).partial().optional(),
  })
  .strict();

export const createProposalBody = z
  .object({
    agentType: z.enum(['TRAVEL', 'SHOPPING', 'EVENTS']),
    merchant: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(300),
    amountCents: cents,
    priority,
  })
  .strict();

export const planIdParams = z.object({ planId: objectId });
export const proposalIdParams = z.object({ proposalId: objectId });
export const commitmentIdParams = z.object({ commitmentId: objectId });
