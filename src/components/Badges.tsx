import { PRIORITY_LABELS } from '../data/constants';
import type { AgentActivity, Priority, ProposalStatus, RecommendedAction } from '../types';

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`badge badge--status-${status.toLowerCase()}`}>
      <span className="badge__dot" aria-hidden />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge badge--priority-${priority}`}>{PRIORITY_LABELS[priority]}</span>;
}

export function ActionBadge({ action }: { action: RecommendedAction }) {
  return <span className={`badge badge--action-${action.toLowerCase()}`}>{action}</span>;
}

const ACTIVITY_TONE: Record<AgentActivity, string> = {
  Idle: 'released',
  'Awaiting reservation': 'proposed',
  Reserved: 'reserved',
  Blocked: 'blocked',
  Paid: 'paid',
};

export function ActivityBadge({ activity }: { activity: AgentActivity }) {
  return (
    <span className={`badge badge--status-${ACTIVITY_TONE[activity]}`}>
      <span className="badge__dot" aria-hidden />
      {activity}
    </span>
  );
}

export function EnvBadge({ label, tone = 'yellow' }: { label: string; tone?: 'yellow' | 'blue' | 'grey' }) {
  return <span className={`pill pill--${tone}`}>{label}</span>;
}

export function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`badge ${connected ? 'badge--status-paid' : 'badge--status-released'}`}>
      <span className="badge__dot" aria-hidden />
      {connected ? 'Connected' : 'Not Connected'}
    </span>
  );
}
