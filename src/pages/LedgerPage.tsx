import { useState } from 'react';
import { AgentAvatar } from '../components/AgentIcon';
import { StatusBadge } from '../components/Badges';
import { Card } from '../components/Card';
import { EmptyState } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { SelectField } from '../components/Field';
import { NAV_ITEMS } from '../config/navigation';
import { useSnapshot } from '../context/CommitMeshContext';
import type { ProposalStatus } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

const STATUS_FILTERS: (ProposalStatus | 'All')[] = ['All', 'Proposed', 'Reserved', 'Blocked', 'Paid', 'Released'];

export function LedgerPage() {
  const { agents, ledger, summary } = useSnapshot();
  const [filter, setFilter] = useState<ProposalStatus | 'All'>('All');
  const page = NAV_ITEMS[3];

  const money = (n: number) => formatMoney(n, summary.currency);
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;
  const rows = filter === 'All' ? ledger : ledger.filter((e) => e.status === filter);

  return (
    <>
      <PageHeader title={page.title} subtitle={page.subtitle} />

      <Card className="balance-card">
        <div className="balance">
          <div className="balance__main">
            <span className="label">Available budget</span>
            <strong className={summary.available < 0 ? 'balance__value text-danger' : 'balance__value'}>
              {money(summary.available)}
            </strong>
            <span className="muted small">
              {money(summary.totalBudget)} total − {money(summary.reserved)} reserved − {money(summary.paid)} paid
            </span>
          </div>
          <dl className="balance__parts">
            <div>
              <dt>Total budget</dt>
              <dd>{money(summary.totalBudget)}</dd>
            </div>
            <div>
              <dt>Reserved</dt>
              <dd>{money(summary.reserved)}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{money(summary.paid)}</dd>
            </div>
            <div>
              <dt>Pending proposals</dt>
              <dd>{money(summary.pendingTotal)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card
        title="Ledger entries"
        subtitle="Newest first. Balance shows the available budget after each event."
        actions={
          <div className="filter">
            <SelectField
              label="Status"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ProposalStatus | 'All')}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
          </div>
        }
        flush
      >
        {rows.length === 0 ? (
          <EmptyState title="No entries match this filter" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event</th>
                  <th>Agent</th>
                  <th>Merchant</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th className="num">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="muted nowrap">{formatDateTime(e.timestamp)}</td>
                    <td className="strong">{e.type}</td>
                    <td>
                      <div className="cell-agent">
                        <AgentAvatar agentId={e.agentId} />
                        <span>{agentName(e.agentId)}</span>
                      </div>
                    </td>
                    <td>{e.merchant}</td>
                    <td className="num strong">{money(e.amount)}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="num">{money(e.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
