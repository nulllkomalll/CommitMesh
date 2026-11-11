import { formatMoney, percent } from '../utils/format';
import type { BudgetSummary } from '../types';

interface BudgetBarProps {
  summary: BudgetSummary;
  /** Show pending (not yet reserved) proposals as a striped segment. */
  showPending?: boolean;
}

export function BudgetBar({ summary, showPending = true }: BudgetBarProps) {
  const { totalBudget, paid, reserved, pendingTotal, currency } = summary;
  const scale = Math.max(totalBudget, summary.totalRequested);
  const over = summary.overBy > 0;

  const segments = [
    { key: 'paid', label: 'Paid', value: paid, className: 'bar__seg--paid' },
    { key: 'reserved', label: 'Reserved', value: reserved, className: 'bar__seg--reserved' },
    ...(showPending
      ? [{ key: 'pending', label: 'Pending proposals', value: pendingTotal, className: 'bar__seg--pending' }]
      : []),
  ];

  return (
    <div className="budget-bar">
      <div
        className="bar"
        role="img"
        aria-label={`Budget usage: ${segments.map((s) => `${s.label} ${formatMoney(s.value, currency)}`).join(', ')} of ${formatMoney(totalBudget, currency)}`}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            className={`bar__seg ${s.className}`}
            style={{ width: `${percent(s.value, scale)}%` }}
          />
        ))}
        {over && (
          <div
            className="bar__limit"
            style={{ left: `${percent(totalBudget, scale)}%` }}
            title="Shared budget limit"
          />
        )}
      </div>
      <ul className="bar__legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`bar__swatch ${s.className}`} aria-hidden />
            {s.label} <strong>{formatMoney(s.value, currency)}</strong>
          </li>
        ))}
        <li>
          <span className="bar__swatch bar__swatch--available" aria-hidden />
          Available <strong>{formatMoney(summary.available, currency)}</strong>
        </li>
      </ul>
    </div>
  );
}
