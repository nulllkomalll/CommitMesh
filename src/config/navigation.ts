export type RouteId =
  | 'overview'
  | 'plans'
  | 'proposals'
  | 'ledger'
  | 'simulator'
  | 'settings';

export interface NavItem {
  id: RouteId;
  label: string;
  title: string;
  subtitle: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Overview',
    subtitle: 'Shared budget health and agent activity at a glance.',
  },
  {
    id: 'plans',
    label: 'Shared Plans',
    title: 'Shared Plans',
    subtitle: 'Define the budget and spending priorities every agent works within.',
  },
  {
    id: 'proposals',
    label: 'Agent Proposals',
    title: 'Agent Proposals',
    subtitle: 'Agents propose spend; the backend decides what gets reserved.',
  },
  {
    id: 'ledger',
    label: 'Commitment Ledger',
    title: 'Commitment Ledger',
    subtitle: 'Every proposal and financial commitment, in order.',
  },
  {
    id: 'simulator',
    label: 'Conflict Simulator',
    title: 'Conflict Simulator',
    subtitle: 'Walk through two agents competing for the same funds.',
  },
  {
    id: 'settings',
    label: 'Settings',
    title: 'Settings',
    subtitle: 'Budget configuration, registered agents and integrations.',
  },
];

export const DEFAULT_ROUTE: RouteId = 'overview';
