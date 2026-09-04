import type { CorrelationId, TenantId } from '@new/shared';
import { redactSensitive } from './redaction.js';

export interface LogRecord {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  correlationId?: CorrelationId;
  tenantId?: TenantId;
  data?: unknown;
}

export interface LogSink {
  write(record: Readonly<Record<string, unknown>>): void;
}

export function createLogger(sink: LogSink = { write: (record) => console.log(JSON.stringify(record)) }) {
  const emit = (record: LogRecord): void => {
    sink.write(redactSensitive({
      ...record,
      at: new Date().toISOString()
    }) as Readonly<Record<string, unknown>>);
  };
  return {
    debug: (message: string, data?: unknown) => emit({ level: 'debug', message, ...(data === undefined ? {} : { data }) }),
    info: (message: string, data?: unknown) => emit({ level: 'info', message, ...(data === undefined ? {} : { data }) }),
    warn: (message: string, data?: unknown) => emit({ level: 'warn', message, ...(data === undefined ? {} : { data }) }),
    error: (message: string, data?: unknown) => emit({ level: 'error', message, ...(data === undefined ? {} : { data }) })
  };
}
