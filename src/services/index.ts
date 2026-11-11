import type { CommitMeshApi } from './api';
import { MockAdapter } from './mockAdapter';

/**
 * Single place where the data source is chosen. To move to the real Express
 * backend, implement `CommitMeshApi` with fetch calls and export it here.
 */
export const api: CommitMeshApi = new MockAdapter();

export { getAgentStats } from './budget';
export type { CommitMeshApi } from './api';
