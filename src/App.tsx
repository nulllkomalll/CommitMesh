
import { useEffect, useRef, useState } from 'react';
import { ErrorBanner, InfoBanner, Spinner } from './components/Feedback';
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
import { api } from './services';
import { messageOf } from './utils/errors';

function PayPalReturnHandler() {
  const { reload } = useCommitMesh();

  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('paypal');

    if (!status || processed.current) return;

    processed.current = true;

    const commitmentId = params.get('commitmentId');

    // Remove PayPal query parameters while preserving the current route.
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${window.location.hash}`,
    );

    if (status === 'cancel') {
      setNotice(
        'PayPal checkout was cancelled. Your reservation remains reserved.',
      );
      return;
    }

    if (status !== 'return') return;

    if (!commitmentId) {
      setError('Missing reservation details from the PayPal return.');
      return;
    }

    setProcessing(true);

    void api
      .capturePayPalPayment(commitmentId)
      .then(async () => {
        await reload();
        setNotice(
          'PayPal payment captured successfully. Your proposal is now Paid.',
        );
      })
      .catch((cause: unknown) => {
        setError(messageOf(cause));
      })
      .finally(() => {
        setProcessing(false);
      });
  }, [reload]);

  return (
    <>
      {processing && (
        <InfoBanner>
          Confirming your PayPal payment. Please wait...
        </InfoBanner>
      )}

      {notice && <InfoBanner>{notice}</InfoBanner>}

      {error && <ErrorBanner message={error} />}
    </>
  );
}

function Routes({
  route,
  onNavigate,
}: {
  route: RouteId;
  onNavigate: (r: RouteId) => void;
}) {
  const { snapshot, loading, loadError, reload } = useCommitMesh();

  if (loadError) {
    return (
      <ErrorBanner
        message={loadError}
        onRetry={() => void reload()}
      />
    );
  }

  if (loading || !snapshot) {
    return <Spinner label="Loading CommitMesh..." />;
  }

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
        <PayPalReturnHandler />
        <Routes route={route} onNavigate={navigate} />
      </AppLayout>
    </CommitMeshProvider>
  );
}
