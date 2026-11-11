import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpenCheck,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Settings as SettingsIcon,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { EnvBadge } from '../components/Badges';
import { Logo } from '../components/Logo';
import { NAV_ITEMS, type RouteId } from '../config/navigation';

const NAV_ICONS: Record<RouteId, LucideIcon> = {
  overview: LayoutDashboard,
  plans: Wallet,
  proposals: Users,
  ledger: BookOpenCheck,
  simulator: FlaskConical,
  settings: SettingsIcon,
};

interface AppLayoutProps {
  route: RouteId;
  onNavigate: (route: RouteId) => void;
  children: ReactNode;
}

export function AppLayout({ route, onNavigate, children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => item.id === route) ?? NAV_ITEMS[0];

  // Close the mobile drawer whenever the route changes, and reset scroll.
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [route]);

  useEffect(() => {
    document.title = `${current.title} · CommitMesh Sandbox`;
  }, [current.title]);

  return (
    <div className="app">
      <aside className={drawerOpen ? 'sidebar is-open' : 'sidebar'} aria-label="Primary">
        <div className="sidebar__brand">
          <Logo />
          <button
            type="button"
            className="icon-btn icon-btn--light sidebar__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            const active = item.id === route;
            return (
              <a
                key={item.id}
                href={`#/${item.id}`}
                className={active ? 'nav-link is-active' : 'nav-link'}
                aria-current={active ? 'page' : undefined}
                title={item.label}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
              >
                <Icon size={19} aria-hidden />
                <span className="nav-link__label">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <strong>Sandbox workspace</strong>
          <span>Mock data only. No real money moves.</span>
        </div>
      </aside>

      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} aria-hidden />}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn topbar__menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <div className="topbar__title">{current.title}</div>
          <div className="topbar__right">
            <EnvBadge label="SANDBOX" />
            <span className="topbar__avatar" title="Demo workspace" aria-hidden>
              CM
            </span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
