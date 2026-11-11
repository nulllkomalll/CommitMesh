import { useState, type FormEvent } from 'react';
import { ArrowLeftRight, CheckCircle2, FlaskConical, RotateCcw, XCircle } from 'lucide-react';
import { AgentAvatar } from '../components/AgentIcon';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner, InfoBanner, Spinner } from '../components/Feedback';
import { TextField } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { EnvBadge } from '../components/Badges';
import { NAV_ITEMS } from '../config/navigation';
import { useSnapshot } from '../context/CommitMeshContext';
import { api } from '../services';
import type { AgentId, SimulationResult } from '../types';
import { messageOf } from '../utils/errors';
import { formatMoney, percent } from '../utils/format';

const DEFAULT_BUDGET = '900';
const DEFAULT_REQUEST = '600';

export function ConflictSimulatorPage() {
  const { agents } = useSnapshot();
  const page = NAV_ITEMS[4];

  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [amount, setAmount] = useState(DEFAULT_REQUEST);
  const [order, setOrder] = useState<[AgentId, AgentId]>(['travel', 'events']);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const agentName = (id: AgentId) => agents.find((a) => a.id === id)?.name ?? id;

  const handleRun = async (event?: FormEvent) => {
    event?.preventDefault();
    setRunning(true);
    setError(null);
    try {
      setResult(
        await api.runConflictSimulation({
          totalBudget: Number(budget),
          requestAmount: Number(amount),
          firstAgent: order[0],
          secondAgent: order[1],
        }),
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setBudget(DEFAULT_BUDGET);
    setAmount(DEFAULT_REQUEST);
    setOrder(['travel', 'events']);
    setResult(null);
    setError(null);
  };

  const final = result?.finalState;

  return (
    <>
      <PageHeader
        title={page.title}
        subtitle={page.subtitle}
        actions={<EnvBadge label="FRONTEND DEMO" tone="blue" />}
      />

      <InfoBanner tone="warning">
        <strong>Frontend demo simulation.</strong> This runs entirely in the mock adapter and is not a real
        database transaction. It will be replaced by the backend concurrency test once connected.
      </InfoBanner>

      <div className="grid grid--1-2">
        <Card title="Scenario" subtitle="Two agents request the same funds at the same moment.">
          <form className="form" onSubmit={handleRun}>
            <div className="form__row">
              <TextField
                label="Shared budget"
                type="number"
                min="1"
                step="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
              />
              <TextField
                label="Each agent requests"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="order">
              <span className="field__label">Lock order (simulated)</span>
              <div className="order__row">
                <span className="order__agent">
                  <AgentAvatar agentId={order[0]} /> {agentName(order[0])}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setOrder([order[1], order[0]])}
                  aria-label="Swap which agent is processed first"
                  title="Swap order"
                >
                  <ArrowLeftRight size={16} />
                </button>
                <span className="order__agent">
                  <AgentAvatar agentId={order[1]} /> {agentName(order[1])}
                </span>
              </div>
              <span className="field__hint">
                In a real system the database lock decides who goes first — it is never the UI.
              </span>
            </div>

            <div className="form__actions">
              <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={handleReset} disabled={running}>
                Reset
              </Button>
              <Button type="submit" loading={running} icon={<FlaskConical size={16} />}>
                Run simulation
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Simulation result">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          {running && <Spinner label="Running simulation…" />}

          {!result && !running && !error && (
            <p className="muted">Run the simulation to see one reservation succeed and one get rejected.</p>
          )}

          {result && !running && final && (
            <div className="sim">
              <div className="sim__banner">Frontend demo simulation — not a database transaction</div>

              <div className="sim__outcomes">
                {result.requests.map((r) => (
                  <div
                    key={r.agentId}
                    className={r.outcome === 'Reserved' ? 'outcome outcome--ok' : 'outcome outcome--no'}
                  >
                    {r.outcome === 'Reserved' ? (
                      <CheckCircle2 size={22} aria-hidden />
                    ) : (
                      <XCircle size={22} aria-hidden />
                    )}
                    <div>
                      <strong>{agentName(r.agentId)}</strong>
                      <span>
                        {r.outcome} · {formatMoney(r.amount)}
                      </span>
                      <small>{r.reason}</small>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="subhead">Final budget state</h3>
              <div className="bar" role="img" aria-label={`${formatMoney(final.reserved)} reserved of ${formatMoney(final.totalBudget)}`}>
                <div
                  className="bar__seg bar__seg--reserved"
                  style={{ width: `${percent(final.reserved, final.totalBudget)}%` }}
                />
              </div>
              <dl className="sim__final">
                <div>
                  <dt>Total</dt>
                  <dd>{formatMoney(final.totalBudget)}</dd>
                </div>
                <div>
                  <dt>Reserved</dt>
                  <dd>{formatMoney(final.reserved)}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{formatMoney(final.available)}</dd>
                </div>
              </dl>

              <h3 className="subhead">Timeline</h3>
              <ol className="timeline">
                {result.steps.map((s, i) => (
                  <li key={i} className={`timeline__item timeline__item--${s.tone}`}>
                    <span className="timeline__time">+{s.offsetMs} ms</span>
                    <div>
                      <span className="timeline__actor">{s.actor}</span>
                      <p>{s.message}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
