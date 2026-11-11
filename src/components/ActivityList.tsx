import type { Agent, CurrencyCode, LedgerEntry } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { AgentAvatar } from './AgentIcon';
import { StatusBadge } from './Badges';
import { EmptyState } from './Feedback';

interface ActivityListProps {
  entries: LedgerEntry[];
  agents: Agent[];
  currency: CurrencyCode;
  limit?: number;
}

export function ActivityList({ entries, agents, currency, limit = 6 }: ActivityListProps) {
  if (entries.length === 0) return <EmptyState title="No activity yet" />;

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <ul className="activity">
      {entries.slice(0, limit).map((entry) => (
        <li key={entry.id} className="activity__item">
          <AgentAvatar agentId={entry.agentId} />
          <div className="activity__main">
            <div className="activity__title">
              {entry.type} <span className="muted">· {entry.merchant}</span>
            </div>
            <div className="activity__meta">
              {agentName(entry.agentId)} · {formatDateTime(entry.timestamp)}
            </div>
          </div>
          <div className="activity__side">
            <div className="strong">{formatMoney(entry.amount, currency)}</div>
            <StatusBadge status={entry.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
