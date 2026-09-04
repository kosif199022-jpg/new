const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'clientsecret',
  'password',
  'openai_api_key',
  'anthropic_api_key',
  'gemini_api_key'
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replaceAll('-', '').replaceAll('_', '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  for (const candidate of sensitiveKeys) {
    if (normalized === normalizeKey(candidate)) return true;
  }
  return false;
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = isSensitiveKey(key) ? '[REDACTED]' : redactSensitive(child);
    }
    return result;
  }
  return value;
}
