import { useState, type FormEvent } from 'react';
import { PlusCircle } from 'lucide-react';
import { BudgetBar } from '../components/BudgetBar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorBanner } from '../components/Feedback';
import { SelectField, TextField } from '../components/Field';
import { PageHeader } from '../components/PageHeader';
import { PriorityBadge } from '../components/Badges';
import { AgentAvatar } from '../components/AgentIcon';
import { NAV_ITEMS } from '../config/navigation';
import { useCommitMesh, useSnapshot } from '../context/CommitMeshContext';
import { AGENT_IDS, CURRENCIES, PRIORITIES, PRIORITY_LABELS } from '../data/constants';
import { api } from '../services';
import type { AgentId, CurrencyCode, Priority } from '../types';
import { formatDate, formatMoney } from '../utils/format';

export function SharedPlansPage() {
  const { plan, agents, summary } = useSnapshot();
  const { run, pending, actionError, dismissActionError } = useCommitMesh();
  const page = NAV_ITEMS[1];

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(plan.currency);
  const [budget, setBudget] = useState('');
  const [priorities, setPriorities] = useState<Record<AgentId, Priority>>(plan.agentPriorities);

  const money = (n: number) => formatMoney(n, summary.currency);
  const agentName = (id: AgentId) => agents.find((a) => a.id === id)?.name ?? id;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await run('create-plan', () =>
      api.createPlan({ name, currency, totalBudget: Number(budget), agentPriorities: priorities }),
    );
    if (ok) {
      setName('');
      setBudget('');
    }
  };

  return (
    <>
      <PageHeader title={page.title} subtitle={page.subtitle} />
      {actionError && <ErrorBanner message={actionError} onDismiss={dismissActionError} />}

      <div className="grid grid--1-1">
        <Card
          title="Current plan"
          subtitle={`Created ${formatDate(plan.createdAt)}`}
        >
          <h3 className="plan-name">{plan.name}</h3>
          <div className="plan-figures">
            <div>
              <span className="label">Total budget</span>
              <strong>{money(plan.totalBudget)}</strong>
            </div>
            <div>
              <span className="label">Remaining</span>
              <strong className={summary.available < 0 ? 'text-danger' : undefined}>
                {money(summary.available)}
              </strong>
            </div>
            <div>
              <span className="label">Currency</span>
              <strong>{plan.currency}</strong>
            </div>
          </div>

          <BudgetBar summary={summary} />

          <h3 className="subhead">Spending priorities</h3>
          <ul className="priority-list">
            {AGENT_IDS.map((id) => (
              <li key={id}>
                <AgentAvatar agentId={id} />
                <span>{agentName(id)}</span>
                <PriorityBadge priority={plan.agentPriorities[id]} />
              </li>
            ))}
          </ul>
          <p className="muted small">
            When funds run short, higher-priority proposals are recommended for funding first.
          </p>
        </Card>

        <Card
          title="Create a shared plan"
          subtitle="Saving replaces the current plan. Existing reservations are kept."
        >
          <form className="form" onSubmit={handleSubmit}>
            <TextField
              label="Plan name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Product Launch"
              required
            />
            <div className="form__row">
              <TextField
                label="Total budget"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="900"
                required
              />
              <SelectField
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <fieldset className="fieldset">
              <legend>Spending priorities</legend>
              {AGENT_IDS.map((id) => (
                <SelectField
                  key={id}
                  label={agentName(id)}
                  value={priorities[id]}
                  onChange={(e) => setPriorities({ ...priorities, [id]: e.target.value as Priority })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </SelectField>
              ))}
            </fieldset>

            <div className="form__actions">
              <Button type="submit" loading={pending === 'create-plan'} icon={<PlusCircle size={16} />}>
                Create plan
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
