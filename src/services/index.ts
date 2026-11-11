import type { CommitMeshApi } from './api';
import { BackendAdapter } from './backendAdapter';

export const api: CommitMeshApi = new BackendAdapter();

export { getAgentStats } from './budget';
export type { CommitMeshApi } from './api';
