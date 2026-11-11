import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../services';
import type { AnalysisResult, Snapshot } from '../types';
import { messageOf } from '../utils/errors';

interface CommitMeshContextValue {
  snapshot: Snapshot | null;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  /** Key of the in-flight action (e.g. "reserve:prop_1"), or null. */
  pending: string | null;
  actionError: string | null;
  dismissActionError: () => void;
  /** Runs a service call that resolves with a new snapshot. Resolves true on success. */
  run: (key: string, action: () => Promise<Snapshot>) => Promise<boolean>;

  analysis: AnalysisResult | null;
  analysisStale: boolean;
  analyzing: boolean;
  analysisError: string | null;
  analyzePlan: () => Promise<void>;
}

const CommitMeshContext = createContext<CommitMeshContextValue | null>(null);

export function CommitMeshProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStale, setAnalysisStale] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setSnapshot(await api.getSnapshot());
    } catch (error) {
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(async (key: string, action: () => Promise<Snapshot>) => {
    setPending(key);
    setActionError(null);
    try {
      setSnapshot(await action());
      setAnalysisStale(true);
      return true;
    } catch (error) {
      setActionError(messageOf(error));
      return false;
    } finally {
      setPending(null);
    }
  }, []);

  const analyzePlan = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      setAnalysis(await api.analyzePlan());
      setAnalysisStale(false);
    } catch (error) {
      setAnalysisError(messageOf(error));
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const dismissActionError = useCallback(() => setActionError(null), []);

  const value = useMemo<CommitMeshContextValue>(
    () => ({
      snapshot,
      loading,
      loadError,
      reload,
      pending,
      actionError,
      dismissActionError,
      run,
      analysis,
      analysisStale,
      analyzing,
      analysisError,
      analyzePlan,
    }),
    [
      snapshot,
      loading,
      loadError,
      reload,
      pending,
      actionError,
      dismissActionError,
      run,
      analysis,
      analysisStale,
      analyzing,
      analysisError,
      analyzePlan,
    ],
  );

  return <CommitMeshContext.Provider value={value}>{children}</CommitMeshContext.Provider>;
}

export function useCommitMesh(): CommitMeshContextValue {
  const ctx = useContext(CommitMeshContext);
  if (!ctx) throw new Error('useCommitMesh must be used inside <CommitMeshProvider>');
  return ctx;
}

/** For pages that only render once data has loaded. */
export function useSnapshot(): Snapshot {
  const { snapshot } = useCommitMesh();
  if (!snapshot) throw new Error('Snapshot not loaded');
  return snapshot;
}
