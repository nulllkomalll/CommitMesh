import { ErrorBanner, Spinner } from './components/Feedback';
import { CommitMeshProvider, useCommitMesh } from './context/CommitMeshContext';
import { useHashRoute } from './hooks/useHashRoute';
import { AppLayout } from './layouts/AppLayout';
import { AgentProposalsPage } from './pages/AgentProposalsPage';
import { ConflictSimulatorPage } from './pages/ConflictSimulatorPage';
import { LedgerPage } from './pages/LedgerPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { SharedPlansPage } from './pages/SharedPlansPage';
import type { RouteId } from './config/navigation';

function Routes({ route, onNavigate }: { route: RouteId; onNavigate: (r: RouteId) => void }) {
  const { snapshot, loading, loadError, reload } = useCommitMesh();

  if (loadError) return <ErrorBanner message={loadError} onRetry={() => void reload()} />;
  if (loading || !snapshot) return <Spinner label="Loading CommitMesh…" />;

  switch (route) {
    case 'overview':
      return <OverviewPage onNavigate={onNavigate} />;
    case 'plans':
      return <SharedPlansPage />;
    case 'proposals':
      return <AgentProposalsPage />;
    case 'ledger':
      return <LedgerPage />;
    case 'simulator':
      return <ConflictSimulatorPage />;
    case 'settings':
      return <SettingsPage />;
  }
}

export default function App() {
  const [route, navigate] = useHashRoute();

  return (
    <CommitMeshProvider>
      <AppLayout route={route} onNavigate={navigate}>
        <Routes route={route} onNavigate={navigate} />
      </AppLayout>
    </CommitMeshProvider>
  );
}
