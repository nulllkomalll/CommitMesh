export type AgentId = 'travel' | 'shopping' | 'events';
export type Priority = 'high' | 'medium' | 'low';
export type ProposalStatus = 'Proposed' | 'Reserved' | 'Blocked' | 'Paid' | 'Released';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'CAD' | 'AUD';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  active: boolean;
  registeredAt: string;
}

export interface SharedPlan {
  id: string;
  name: string;
  currency: CurrencyCode;
  totalBudget: number;
  agentPriorities: Record<AgentId, Priority>;
  createdAt: string;
}

export interface Proposal {
  id: string;
  agentId: AgentId;
  merchant: string;
  description: string;
  amount: number;
  priority: Priority;
  status: ProposalStatus;
  statusNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type LedgerEventType =
  | 'Proposal submitted'
  | 'Reservation'
  | 'Reservation blocked'
  | 'Release'
  | 'Payment';

export interface LedgerEntry {
  id: string;
  proposalId: string;
  agentId: AgentId;
  merchant: string;
  type: LedgerEventType;
  amount: number;
  status: ProposalStatus;
  timestamp: string;
  /** Available budget immediately after this event. */
  balanceAfter: number;
}

export interface BudgetSummary {
  currency: CurrencyCode;
  totalBudget: number;
  reserved: number;
  paid: number;
  available: number;
  /** Sum of Proposed + Reserved + Paid proposals (live demand on the budget). */
  totalRequested: number;
  /** Sum of proposals still awaiting a reservation decision. */
  pendingTotal: number;
  overBy: number;
}

export type AgentActivity = 'Idle' | 'Awaiting reservation' | 'Reserved' | 'Blocked' | 'Paid';

export interface AgentStats {
  proposalCount: number;
  requested: number;
  reserved: number;
  paid: number;
  activity: AgentActivity;
}

export interface IntegrationStatus {
  id: 'gemini' | 'paypal-sandbox';
  name: string;
  description: string;
  connected: boolean;
  detail: string;
}

export interface Snapshot {
  plan: SharedPlan;
  agents: Agent[];
  proposals: Proposal[];
  ledger: LedgerEntry[];
  integrations: IntegrationStatus[];
  summary: BudgetSummary;
}

/** Everything in a snapshot except values derived from it. */
export type CoreState = Omit<Snapshot, 'summary'>;

/* ---------- Inputs ---------- */

export interface CreatePlanInput {
  name: string;
  currency: CurrencyCode;
  totalBudget: number;
  agentPriorities: Record<AgentId, Priority>;
}

export interface UpdateBudgetInput {
  totalBudget: number;
  currency: CurrencyCode;
}

export interface SubmitProposalInput {
  agentId: AgentId;
  merchant: string;
  description: string;
  amount: number;
  priority: Priority;
}

/* ---------- Conflict analysis ---------- */

export type RecommendedAction = 'Approve' | 'Defer' | 'Reject';

export interface Recommendation {
  proposalId: string;
  agentId: AgentId;
  merchant: string;
  amount: number;
  priority: Priority;
  action: RecommendedAction;
  reason: string;
}

export interface BudgetConflict {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  detail: string;
}

export interface DuplicateGroup {
  id: string;
  reason: string;
  items: { proposalId: string; agentId: AgentId; merchant: string; amount: number }[];
}

export interface AnalysisResult {
  generatedAt: string;
  engine: string;
  currency: CurrencyCode;
  summary: string;
  conflicts: BudgetConflict[];
  duplicates: DuplicateGroup[];
  recommendations: Recommendation[];
  approvedTotal: number;
  deferredTotal: number;
  rejectedTotal: number;
  remainingAfter: number;
  disclaimer: string;
}

/* ---------- Conflict simulator ---------- */

export interface SimulationInput {
  totalBudget: number;
  requestAmount: number;
  /** Order in which the simulated backend serialises the two requests. */
  firstAgent: AgentId;
  secondAgent: AgentId;
}

export interface SimulationStep {
  offsetMs: number;
  actor: 'Agents' | 'Backend (simulated)';
  message: string;
  tone: 'info' | 'success' | 'danger';
}

export interface SimulationRequestOutcome {
  agentId: AgentId;
  amount: number;
  outcome: 'Reserved' | 'Rejected';
  reason: string;
}

export interface SimulationResult {
  ranAt: string;
  isSimulation: true;
  steps: SimulationStep[];
  requests: SimulationRequestOutcome[];
  finalState: { totalBudget: number; reserved: number; available: number };
}
