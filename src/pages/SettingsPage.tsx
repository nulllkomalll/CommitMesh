import { useState, type FormEvent } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { AgentAvatar } from '../components/AgentIcon';
import { ConnectionBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner, InfoBanner } from '../components/Feedback';
import { SelectField, TextField } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { NAV_ITEMS } from '../config/navigation';
import { useCommitMesh, useSnapshot } from '../context/CommitMeshContext';
import { CURRENCIES } from '../data/constants';
import { api } from '../services';
import type { CurrencyCode } from '../types';
import { formatDate } from '../utils/format';

export function SettingsPage() {
  const { plan, agents, integrations } = useSnapshot();
  const { run, pending, actionError, dismissActionError } = useCommitMesh();
  const page = NAV_ITEMS[5];

  const [budget, setBudget] = useState(String(plan.totalBudget));
  const [currency, setCurrency] = useState<CurrencyCode>(plan.currency);
  const [saved, setSaved] = useState(false);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const ok = await run('update-budget', () =>
      api.updateBudget({ totalBudget: Number(budget), currency }),
    );
    setSaved(ok);
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all proposals, ledger entries and the plan to the demo seed data?')) return;
    const ok = await run('reset', () => api.resetDemoData());
    if (ok) {
      setSaved(false);
      window.location.reload();
    }
  };

  return (
    <>
      <PageHeader title={page.title} subtitle={page.subtitle} />
      {actionError && <ErrorBanner message={actionError} onDismiss={dismissActionError} />}

      <div className="grid grid--1-1">
        <Card title="Shared budget" subtitle={`Plan: ${plan.name}`}>
          <form className="form" onSubmit={handleSave}>
            <div className="form__row">
              <TextField
                label="Total budget"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  setSaved(false);
                }}
                required
              />
              <SelectField
                label="Currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as CurrencyCode);
                  setSaved(false);
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="form__actions">
              {saved && <span className="saved">Saved</span>}
              <Button type="submit" loading={pending === 'update-budget'} icon={<Save size={16} />}>
                Save budget
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Registered agents" subtitle="Agents allowed to submit proposals." flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cell-agent">
                        <AgentAvatar agentId={a.id} />
                        <span className="strong">{a.name}</span>
                      </div>
                    </td>
                    <td className="muted">{a.role}</td>
                    <td className="muted nowrap">{formatDate(a.registeredAt)}</td>
                    <td>
                      <span className={a.active ? 'badge badge--status-paid' : 'badge badge--status-released'}>
                        <span className="badge__dot" aria-hidden />
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Integrations" subtitle="External services the backend will connect to.">
        <div className="integrations">
          {integrations.map((i) => (
            <div key={i.id} className="integration">
              <div className="integration__head">
                <h3>{i.name}</h3>
                <ConnectionBadge connected={i.connected} />
              </div>
              <p>{i.description}</p>
              <p className="muted small">{i.detail}</p>
            </div>
          ))}
        </div>
        <InfoBanner>
          PayPal Sandbox is a placeholder. No payment requests are made from this frontend — payment
          authorisation will live on the backend.
        </InfoBanner>
      </Card>

      <Card title="Demo data" subtitle="Everything here is mock data stored in this browser only.">
        <Button
          variant="danger"
          icon={<RotateCcw size={16} />}
          loading={pending === 'reset'}
          onClick={() => void handleReset()}
        >
          Reset demo data
        </Button>
      </Card>
    </>
  );
}
