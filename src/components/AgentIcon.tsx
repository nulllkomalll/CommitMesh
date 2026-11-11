import { CalendarDays, Plane, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { AgentId } from '../types';

const ICONS: Record<AgentId, LucideIcon> = {
  travel: Plane,
  shopping: ShoppingBag,
  events: CalendarDays,
};

export function AgentIcon({ agentId, size = 20 }: { agentId: AgentId; size?: number }) {
  const Icon = ICONS[agentId];
  return <Icon size={size} aria-hidden />;
}

export function AgentAvatar({ agentId }: { agentId: AgentId }) {
  return (
    <span className={`agent-avatar agent-avatar--${agentId}`}>
      <AgentIcon agentId={agentId} size={18} />
    </span>
  );
}
