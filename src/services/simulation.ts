import type {
  SimulationInput,
  SimulationRequestOutcome,
  SimulationResult,
  SimulationStep,
} from '../types';
import { ApiError } from '../utils/errors';
import { formatMoney } from '../utils/format';
import { evaluateReservation } from './budget';

const AGENT_LABEL = { travel: 'Travel Agent', shopping: 'Shopping Agent', events: 'Events Agent' } as const;

/**
 * Frontend-only illustration of how a serialised reservation would resolve two
 * simultaneous requests. This is NOT a database transaction and proves nothing
 * about real concurrency — that guarantee must come from the backend.
 */
export function runConflictSimulation(input: SimulationInput): SimulationResult {
  const { totalBudget, requestAmount, firstAgent, secondAgent } = input;

  if (!(totalBudget > 0) || !(requestAmount > 0)) {
    throw new ApiError('Budget and request amount must be greater than zero.');
  }
  if (firstAgent === secondAgent) {
    throw new ApiError('Choose two different agents.');
  }

  const money = (n: number) => formatMoney(n);
  const steps: SimulationStep[] = [];
  const requests: SimulationRequestOutcome[] = [];
  let reserved = 0;
  let t = 0;

  steps.push({
    offsetMs: t,
    actor: 'Agents',
    message: `${AGENT_LABEL[firstAgent]} and ${AGENT_LABEL[secondAgent]} each request ${money(requestAmount)} at the same instant against a shared ${money(totalBudget)} budget.`,
    tone: 'info',
  });

  const queue = [firstAgent, secondAgent];
  queue.forEach((agentId, index) => {
    t += 1;
    steps.push({
      offsetMs: t,
      actor: 'Backend (simulated)',
      message:
        index === 0
          ? `${AGENT_LABEL[agentId]} acquires the budget lock first; the other request waits.`
          : `${AGENT_LABEL[agentId]} acquires the budget lock after the first request completes.`,
      tone: 'info',
    });

    const available = totalBudget - reserved;
    const decision = evaluateReservation(available, requestAmount);
    t += 1;

    if (decision.granted) {
      reserved += requestAmount;
      steps.push({
        offsetMs: t,
        actor: 'Backend (simulated)',
        message: `${AGENT_LABEL[agentId]}: ${money(available)} available ≥ ${money(requestAmount)} → reservation granted. ${money(totalBudget - reserved)} now available.`,
        tone: 'success',
      });
      requests.push({
        agentId,
        amount: requestAmount,
        outcome: 'Reserved',
        reason: `Reserved ${money(requestAmount)}.`,
      });
    } else {
      steps.push({
        offsetMs: t,
        actor: 'Backend (simulated)',
        message: `${AGENT_LABEL[agentId]}: only ${money(available)} available < ${money(requestAmount)} → reservation rejected.`,
        tone: 'danger',
      });
      requests.push({
        agentId,
        amount: requestAmount,
        outcome: 'Rejected',
        reason: `Only ${money(available)} was available.`,
      });
    }
  });

  return {
    ranAt: new Date().toISOString(),
    isSimulation: true,
    steps,
    requests,
    finalState: { totalBudget, reserved, available: totalBudget - reserved },
  };
}
