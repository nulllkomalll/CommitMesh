
import { CreditCard, Lock, Undo2 } from 'lucide-react';
import type { Agent, CurrencyCode, Proposal } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { AgentAvatar } from './AgentIcon';
import { PriorityBadge, StatusBadge } from './Badges';
import { Button } from './Button';
import { EmptyState } from './Feedback';

interface ProposalTableProps {
  proposals: Proposal[];
  agents: Agent[];
  currency: CurrencyCode;
  pending: string | null;
  onReserve: (proposalId: string) => void;
  onRelease: (proposalId: string) => void;
  onPay: (proposalId: string) => void;
}

export function ProposalTable({
  proposals,
  agents,
  currency,
  pending,
  onReserve,
  onRelease,
  onPay,
}: ProposalTableProps) {
  if (proposals.length === 0) {
    return (
      <EmptyState title="No proposals yet">
        Use an agent card above to submit the first one.
      </EmptyState>
    );
  }

  const agentName = (id: string) =>
    agents.find((a) => a.id === id)?.name ?? id;

  const sorted = [...proposals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Merchant</th>
            <th>Description</th>
            <th className="num">Amount</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Submitted</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((p) => {
            const canReserve =
              p.status === 'Proposed' || p.status === 'Blocked';

            const canRelease =
              p.status !== 'Paid' && p.status !== 'Released';

            const canPay = p.status === 'Reserved';

            const reserving = pending === `reserve:${p.id}`;
            const releasing = pending === `release:${p.id}`;
            const paying = pending === `paypal:${p.id}`;

            return (
              <tr key={p.id}>
                <td>
                  <div className="cell-agent">
                    <AgentAvatar agentId={p.agentId} />
                    <span>{agentName(p.agentId)}</span>
                  </div>
                </td>

                <td className="strong">{p.merchant}</td>
                <td className="muted">{p.description}</td>
                <td className="num strong">
                  {formatMoney(p.amount, currency)}
                </td>

                <td>
                  <PriorityBadge priority={p.priority} />
                </td>

                <td>
                  <StatusBadge status={p.status} />
                  {p.statusNote && (
                    <div className="status-note">{p.statusNote}</div>
                  )}
                </td>

                <td className="muted nowrap">
                  {formatDateTime(p.createdAt)}
                </td>

                <td className="actions-col">
                  <div className="row-actions">
                    {canReserve && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Lock size={14} />}
                        loading={reserving}
                        disabled={pending !== null}
                        onClick={() => onReserve(p.id)}
                      >
                        {p.status === 'Blocked' ? 'Retry' : 'Reserve'}
                      </Button>
                    )}

                    {canPay && (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<CreditCard size={14} />}
                        loading={paying}
                        disabled={pending !== null}
                        onClick={() => onPay(p.id)}
                      >
                        Pay with PayPal
                      </Button>
                    )}

                    {canRelease && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Undo2 size={14} />}
                        loading={releasing}
                        disabled={pending !== null}
                        onClick={() => onRelease(p.id)}
                      >
                        {p.status === 'Reserved' ? 'Release' : 'Withdraw'}
                      </Button>
                    )}

                    {!canReserve && !canRelease && (
                      <span className="muted">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
