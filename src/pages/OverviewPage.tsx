import { Bot, CheckCircle2, Lock, PiggyBank, Wallet } from 'lucide-react';
import { ActivityList } from '../components/ActivityList';
import { AgentCard } from '../components/AgentCard';
import { BudgetBar } from '../components/BudgetBar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InfoBanner } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { NAV_ITEMS, type RouteId } from '../config/navigation';
import { useCommitMesh, useSnapshot } from '../context/CommitMeshContext';
import { getAgentStats } from '../services';
import { formatMoney } from '../utils/format';

export function OverviewPage({ onNavigate }: { onNavigate: (route: RouteId) => void }) {
  const { plan, agents, proposals, ledger, summary } = useSnapshot();
  const { pending } = useCommitMesh();
  const page = NAV_ITEMS[0];
  const money = (n: number) => formatMoney(n, summary.currency);
  const activeAgents = agents.filter((a) => a.active).length;

  return (
    <>
      <PageHeader title={page.title} subtitle={`${plan.name} · ${page.subtitle}`} />

      {summary.overBy > 0 && (
        <InfoBanner tone="warning">
          Agents have requested {money(summary.totalRequested)} against a {money(summary.totalBudget)} shared
          budget — {money(summary.overBy)} over.{' '}
          <button type="button" className="link-btn" onClick={() => onNavigate('proposals')}>
            Review proposals and run analysis
          </button>
        </InfoBanner>
      )}

      <div className="stat-grid">
        <StatCard
          label="Total shared budget"
          value={money(summary.totalBudget)}
          hint={plan.currency}
          icon={<Wallet size={18} />}
          tone="primary"
        />
        <StatCard
          label="Reserved"
          value={money(summary.reserved)}
          hint="Held for approved proposals"
          icon={<Lock size={18} />}
        />
        <StatCard
          label="Paid"
          value={money(summary.paid)}
          hint="Settled via backend"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Available"
          value={money(summary.available)}
          hint={summary.pendingTotal > 0 ? `${money(summary.pendingTotal)} pending proposals` : 'Unreserved budget'}
          icon={<PiggyBank size={18} />}
          tone={summary.overBy > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Active agents"
          value={`${activeAgents} of ${agents.length}`}
          hint="Registered and able to propose"
          icon={<Bot size={18} />}
        />
      </div>

      <Card title="Budget usage" subtitle="How the shared budget is currently committed.">
        <BudgetBar summary={summary} />
      </Card>

      <div className="grid grid--2-1">
        <Card
          title="Recent commitment activity"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('ledger')}>
              View ledger
            </Button>
          }
        >
          <ActivityList entries={ledger} agents={agents} currency={summary.currency} />
        </Card>

        <div className="stack">
          <h2 className="section-title">Agent status</h2>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              stats={getAgentStats(agent.id, proposals)}
              currency={summary.currency}
              defaultPriority={plan.agentPriorities[agent.id]}
              busy={pending !== null}
              compact
            />
          ))}
        </div>
      </div>
    </>
  );
}
