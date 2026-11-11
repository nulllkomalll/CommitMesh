import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Agent, AgentStats, CurrencyCode, Priority, SubmitProposalInput } from '../types';
import { formatMoney } from '../utils/format';
import { AgentAvatar } from './AgentIcon';
import { ActivityBadge, PriorityBadge } from './Badges';
import { Button } from './Button';
import { ProposalForm } from './ProposalForm';

interface AgentCardProps {
  agent: Agent;
  stats: AgentStats;
  currency: CurrencyCode;
  defaultPriority: Priority;
  busy: boolean;
  /** When true the card shows the stats-only variant used on the Overview page. */
  compact?: boolean;
  onSubmitProposal?: (input: SubmitProposalInput) => Promise<boolean>;
}

export function AgentCard({
  agent,
  stats,
  currency,
  defaultPriority,
  busy,
  compact = false,
  onSubmitProposal,
}: AgentCardProps) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <article className="agent-card">
      <header className="agent-card__header">
        <AgentAvatar agentId={agent.id} />
        <div className="agent-card__heading">
          <h3>{agent.name}</h3>
          <p>{agent.role}</p>
        </div>
        <ActivityBadge activity={stats.activity} />
      </header>

      <dl className="agent-card__stats">
        <div>
          <dt>Requested</dt>
          <dd>{formatMoney(stats.requested, currency)}</dd>
        </div>
        <div>
          <dt>Reserved</dt>
          <dd>{formatMoney(stats.reserved, currency)}</dd>
        </div>
        <div>
          <dt>Proposals</dt>
          <dd>{stats.proposalCount}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>
            <PriorityBadge priority={defaultPriority} />
          </dd>
        </div>
      </dl>

      {!compact && onSubmitProposal && (
        <div className="agent-card__footer">
          {formOpen ? (
            <ProposalForm
              agentId={agent.id}
              defaultPriority={defaultPriority}
              currencyCode={currency}
              busy={busy}
              onSubmit={onSubmitProposal}
              onCancel={() => setFormOpen(false)}
            />
          ) : (
            <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              Submit Proposal
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
