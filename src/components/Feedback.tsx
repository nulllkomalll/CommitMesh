import type { ReactNode } from 'react';
import { AlertCircle, Info, Loader2, X } from 'lucide-react';
import { Button } from './Button';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status">
      <Loader2 size={22} className="spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="banner banner--error" role="alert">
      <AlertCircle size={18} aria-hidden />
      <span className="banner__text">{message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
      {onDismiss && (
        <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss error">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function InfoBanner({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning';
}) {
  return (
    <div className={`banner banner--${tone}`} role="note">
      <Info size={18} aria-hidden />
      <span className="banner__text">{children}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
