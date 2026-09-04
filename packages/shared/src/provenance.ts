import type { CorrelationId } from './ids.js';

export interface Provenance {
  actor: string;
  at: string;
  correlationId: CorrelationId;
  sourceRefs: readonly string[];
}
