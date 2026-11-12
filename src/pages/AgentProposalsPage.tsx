
import { AgentCard } from '../components/AgentCard';
import { AnalysisPanel } from '../components/AnalysisPanel';
import { Card } from '../components/Card';
import { ErrorBanner, InfoBanner } from '../components/Feedback';
import { PageHeader } from '../components/PageHeader';
import { ProposalTable } from '../components/ProposalTable';
import { NAV_ITEMS } from '../config/navigation';
import { useCommitMesh, useSnapshot } from '../context/CommitMeshContext';
import { api, getAgentStats } from '../services';
import type { SubmitProposalInput } from '../types';
import { formatMoney } from '../utils/format';

export function AgentProposalsPage() {
  const { plan, agents, proposals, summary } = useSnapshot();

  const {
    run,
    pending,
    actionError,
    dismissActionError,
    startPayPalCheckout,
    analysis,
    analysisStale,
    analyzing,
    analysisError,
    analyzePlan,
  } = useCommitMesh();

  const page = NAV_ITEMS[2];

  const submit = (input: SubmitProposalInput) =>
    run('submit', () => api.submitProposal(input));

  return (
    <>
      <PageHeader title={page.title} subtitle={page.subtitle} />

      {actionError && (
        <ErrorBanner
          message={actionError}
          onDismiss={dismissActionError}
        />
      )}

      {summary.overBy > 0 && (
        <InfoBanner tone="warning">
          Total requested is {formatMoney(summary.totalRequested, summary.currency)} against{' '}
          {formatMoney(summary.totalBudget, summary.currency)} — over budget by{' '}
          {formatMoney(summary.overBy, summary.currency)}.
        </InfoBanner>
      )}

      <div className="grid grid--3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            stats={getAgentStats(agent.id, proposals)}
            currency={summary.currency}
            defaultPriority={plan.agentPriorities[agent.id]}
            busy={pending === 'submit'}
            onSubmitProposal={submit}
          />
        ))}
      </div>

      <Card
        title="Submitted proposals"
        subtitle="Reserve funds, release commitments, or complete an approved PayPal Sandbox payment."
        flush
      >
        <ProposalTable
          proposals={proposals}
          agents={agents}
          currency={summary.currency}
          pending={pending}
          onReserve={(id) =>
            void run(`reserve:${id}`, () => api.requestReservation(id))
          }
          onRelease={(id) =>
            void run(`release:${id}`, () => api.requestRelease(id))
          }
          onPay={(id) => void startPayPalCheckout(id)}
        />
      </Card>

      <AnalysisPanel
        analysis={analysis}
        agents={agents}
        stale={analysisStale}
        loading={analyzing}
        error={analysisError}
        onAnalyze={() => void analyzePlan()}
      />
    </>
  );
}
