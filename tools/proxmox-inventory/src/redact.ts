/**
 * Security utilities for redacting sensitive information
 */

const SENSITIVE_KEYS = [
  'password',
  'secret',
  'token',
  'key',
  'authorization',
  'auth',
  'credential',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
];

const REDACTED = '[REDACTED]';

/**
 * Check if a key name suggests sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive));
}

/**
 * Redact sensitive values from an object recursively
 */
export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitive(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Redact URL credentials and sensitive query parameters
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove password from URL
    if (parsed.password) {
      parsed.password = REDACTED;
    }
    
    // Redact sensitive query parameters
    for (const key of parsed.searchParams.keys()) {
      if (isSensitiveKey(key)) {
        parsed.searchParams.set(key, REDACTED);
      }
    }
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, just return a generic redacted message
    return '[REDACTED_URL]';
  }
}

/**
 * Create a safe error message with redacted details
 */
export function createSafeError(message: string, details?: unknown): Error {
  const error = new Error(message);
  if (details) {
    (error as any).details = redactSensitive(details);
  }
  return error;
}

/**
 * Redact sensitive parts of configuration for logging
 */
export function redactConfig(config: Record<string, unknown>): Record<string, unknown> {
  return redactSensitive(config) as Record<string, unknown>;
}
