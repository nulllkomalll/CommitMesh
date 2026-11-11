import { Plan, PlanDoc } from '../models/Plan';
import { AppError, notFound } from '../utils/errors';
import { planDto } from './serializers';

export interface CreatePlanInput {
  name: string;
  budgetCents: number;
  currency: 'USD';
  priorities?: { TRAVEL?: 'high' | 'medium' | 'low'; SHOPPING?: 'high' | 'medium' | 'low'; EVENTS?: 'high' | 'medium' | 'low' };
}

export async function createPlan(input: CreatePlanInput) {
  const doc = await Plan.create({
    name: input.name,
    budgetCents: input.budgetCents,
    currency: input.currency,
    priorities: input.priorities,
  });
  return planDto(doc.toObject() as unknown as PlanDoc);
}

export async function getPlanOrThrow(planId: string): Promise<PlanDoc> {
  const plan = await Plan.findById(planId).lean<PlanDoc>();
  if (!plan) throw notFound('Plan');
  return plan;
}

export async function getPlan(planId: string) {
  return planDto(await getPlanOrThrow(planId));
}

export function assertPlanExists(plan: PlanDoc | null): asserts plan is PlanDoc {
  if (!plan) throw new AppError(404, 'NOT_FOUND', 'Plan not found.');
}
