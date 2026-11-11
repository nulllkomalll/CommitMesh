import { AlertTriangle, Copy, ShieldAlert, Sparkles } from 'lucide-react';
import type { Agent, AnalysisResult } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';
import { ActionBadge, PriorityBadge } from './Badges';
import { Button } from './Button';
import { Card } from './Card';
import { ErrorBanner, InfoBanner, Spinner } from './Feedback';

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  agents: Agent[];
  stale: boolean;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

export function AnalysisPanel({ analysis, agents, stale, loading, error, onAnalyze }: AnalysisPanelProps) {
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <Card
      className="analysis"
      title="Conflict analysis"
      subtitle="Detect budget conflicts and duplicate proposals before the backend reserves funds."
      actions={
        <Button
          icon={<Sparkles size={16} />}
          loading={loading}
          onClick={onAnalyze}
        >
          {analysis ? 'Re-run analysis' : 'Analyze Plan'}
        </Button>
      }
    >
      <div className="ai-label" role="note">
        <ShieldAlert size={16} aria-hidden />
        <span>
          <strong>AI recommendation — not payment authorization.</strong> Only the backend can reserve or
          pay.
        </span>
      </div>

      {error && <ErrorBanner message={error} onRetry={onAnalyze} />}
      {loading && !analysis && <Spinner label="Analyzing plan…" />}

      {!analysis && !loading && !error && (
        <p className="muted analysis__empty">
          Run an analysis to see which proposals fit the shared budget and which should wait.
        </p>
      )}

      {analysis && (
        <div className={loading ? 'analysis__body is-refreshing' : 'analysis__body'}>
          {stale && (
            <InfoBanner tone="warning">
              Proposals have changed since this analysis ran. Re-run it for current guidance.
            </InfoBanner>
          )}

          <div className="analysis__summary">
            <div className="analysis__summary-icon" aria-hidden>
              <Sparkles size={18} />
            </div>
            <div>
              <p className="analysis__summary-text">{analysis.summary}</p>
              <p className="analysis__meta">
                {analysis.engine} · {formatDateTime(analysis.generatedAt)}
              </p>
            </div>
          </div>

          <div className="analysis__totals">
            <div className="total total--approve">
              <span>Approve</span>
              <strong>{formatMoney(analysis.approvedTotal, analysis.currency)}</strong>
            </div>
            <div className="total total--defer">
              <span>Defer</span>
              <strong>{formatMoney(analysis.deferredTotal, analysis.currency)}</strong>
            </div>
            <div className="total total--reject">
              <span>Reject</span>
              <strong>{formatMoney(analysis.rejectedTotal, analysis.currency)}</strong>
            </div>
            <div className="total">
              <span>Left unallocated</span>
              <strong>{formatMoney(analysis.remainingAfter, analysis.currency)}</strong>
            </div>
          </div>

          <div className="analysis__columns">
            <section>
              <h3 className="subhead">
                <AlertTriangle size={16} aria-hidden /> Budget conflicts
              </h3>
              {analysis.conflicts.length === 0 ? (
                <p className="muted">No budget conflicts detected.</p>
              ) : (
                <ul className="finding-list">
                  {analysis.conflicts.map((c) => (
                    <li key={c.id} className={`finding finding--${c.severity}`}>
                      <strong>{c.title}</strong>
                      <span>{c.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="subhead">
                <Copy size={16} aria-hidden /> Duplicate proposals
              </h3>
              {analysis.duplicates.length === 0 ? (
                <p className="muted">No duplicate proposals detected.</p>
              ) : (
                <ul className="finding-list">
                  {analysis.duplicates.map((d) => (
                    <li key={d.id} className="finding finding--medium">
                      <strong>{d.reason}</strong>
                      <span>
                        {d.items
                          .map((i) => `${agentName(i.agentId)} — ${formatMoney(i.amount, analysis.currency)}`)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <h3 className="subhead">Recommended actions</h3>
          {analysis.recommendations.length === 0 ? (
            <p className="muted">Nothing is waiting for a decision.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Proposal</th>
                    <th>Priority</th>
                    <th className="num">Amount</th>
                    <th>Recommendation</th>
                    <th>Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.recommendations.map((r) => (
                    <tr key={r.proposalId}>
                      <td>
                        <div className="strong">{agentName(r.agentId)}</div>
                        <div className="muted">{r.merchant}</div>
                      </td>
                      <td>
                        <PriorityBadge priority={r.priority} />
                      </td>
                      <td className="num strong">{formatMoney(r.amount, analysis.currency)}</td>
                      <td>
                        <ActionBadge action={r.action} />
                      </td>
                      <td className="muted reason">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="analysis__disclaimer">{analysis.disclaimer}</p>
        </div>
      )}
    </Card>
  );
}
