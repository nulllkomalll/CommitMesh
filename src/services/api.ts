import type {
  AnalysisResult,
  CreatePlanInput,
  SimulationInput,
  SimulationResult,
  Snapshot,
  SubmitProposalInput,
  UpdateBudgetInput,
} from '../types';

/**
 * The contract the UI depends on. The mock adapter implements it today; a real
 * Express-backed adapter can implement the same interface later without any
 * UI changes. Reservation and payment authority belong to the backend —
 * these methods only *request* actions and report the resulting state.
 *
 * Mutations resolve with the full, updated snapshot so the UI never has to
 * recompute balances or statuses itself.
 */
export interface CommitMeshApi {
  getSnapshot(): Promise<Snapshot>;
  createPlan(input: CreatePlanInput): Promise<Snapshot>;
  updateBudget(input: UpdateBudgetInput): Promise<Snapshot>;
  submitProposal(input: SubmitProposalInput): Promise<Snapshot>;
  /** Ask the backend to reserve funds. The backend decides the outcome. */
  requestReservation(proposalId: string): Promise<Snapshot>;
  /** Ask the backend to release (or withdraw) a proposal. */
  requestRelease(proposalId: string): Promise<Snapshot>;
  analyzePlan(): Promise<AnalysisResult>;
  runConflictSimulation(input: SimulationInput): Promise<SimulationResult>;
  resetDemoData(): Promise<Snapshot>;
}
