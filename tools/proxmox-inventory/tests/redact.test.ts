/**
 * Tests for security redaction utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  redactSensitive,
  redactUrl,
  createSafeError,
  redactConfig,
} from '../src/redact.js';

describe('Redaction utilities', () => {
  describe('redactSensitive', () => {
    it('should redact sensitive keys in objects', () => {
      const input = {
        username: 'admin',
        password: 'secret123',
        apiKey: 'key123',
        data: 'safe-value',
      };

      const result = redactSensitive(input);

      expect(result).toEqual({
        username: 'admin',
        password: '[REDACTED]',
        apiKey: '[REDACTED]',
        data: 'safe-value',
      });
    });

    it('should redact nested sensitive values', () => {
      const input = {
        config: {
          token: 'secret-token',
          timeout: 5000,
        },
        info: {
          secret: 'secret-value',
          name: 'test',
        },
      };

      const result = redactSensitive(input);

      expect((result as any).config.token).toBe('[REDACTED]');
      expect((result as any).config.timeout).toBe(5000);
      expect((result as any).info.secret).toBe('[REDACTED]');
      expect((result as any).info.name).toBe('test');
    });

    it('should handle arrays', () => {
      const input = [
        { name: 'item1', password: 'secret1' },
        { name: 'item2', apiKey: 'key2' },
      ];

      const result = redactSensitive(input);

      expect(Array.isArray(result)).toBe(true);
      expect((result as any)[0].password).toBe('[REDACTED]');
      expect((result as any)[1].apiKey).toBe('[REDACTED]');
      expect((result as any)[0].name).toBe('item1');
    });

    it('should handle null and undefined', () => {
      expect(redactSensitive(null)).toBeNull();
      expect(redactSensitive(undefined)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(redactSensitive('string')).toBe('string');
      expect(redactSensitive(123)).toBe(123);
      expect(redactSensitive(true)).toBe(true);
    });

    it('should redact various sensitive key patterns', () => {
      const input = {
        access_token: 'token1',
        refresh_token: 'token2',
        authorization: 'Bearer xxx',
        api_key: 'key1',
        TOKEN_SECRET: 'secret1',
        auth_header: 'header1',
      };

      const result = redactSensitive(input) as any;

      expect(result.access_token).toBe('[REDACTED]');
      expect(result.refresh_token).toBe('[REDACTED]');
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
      expect(result.TOKEN_SECRET).toBe('[REDACTED]');
      expect(result.auth_header).toBe('[REDACTED]');
    });
  });

  describe('redactUrl', () => {
    it('should redact password in URL', () => {
      const url = 'https://user:password@example.com/path';
      const result = redactUrl(url);

      expect(result).toMatch(/REDACTED/);
      expect(result).not.toContain('password');
      expect(result).toContain('user');
      expect(result).toContain('example.com');
    });

    it('should redact sensitive query parameters', () => {
      const url = 'https://example.com/api?token=secret123&page=1';
      const result = redactUrl(url);

      expect(result).toMatch(/REDACTED/);
      expect(result).not.toContain('secret123');
      expect(result).toContain('page=1');
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const result = redactUrl(url);

      expect(result).toBe('[REDACTED_URL]');
    });

    it('should preserve non-sensitive parts', () => {
      const url = 'https://example.com:8006/api/v1/resource?id=123';
      const result = redactUrl(url);

      expect(result).toContain('example.com');
      expect(result).toContain('8006');
      expect(result).toContain('/api/v1/resource');
      expect(result).toContain('id=123');
    });
  });

  describe('createSafeError', () => {
    it('should create error with redacted details', () => {
      const details = {
        username: 'admin',
        password: 'secret123',
      };

      const error = createSafeError('Test error', details);

      expect(error.message).toBe('Test error');
      expect((error as any).details.username).toBe('admin');
      expect((error as any).details.password).toBe('[REDACTED]');
    });

    it('should create error without details', () => {
      const error = createSafeError('Test error');

      expect(error.message).toBe('Test error');
      expect((error as any).details).toBeUndefined();
    });
  });

  describe('redactConfig', () => {
    it('should redact configuration object', () => {
      const config = {
        baseUrl: 'https://example.com',
        tokenId: 'user@pam!mytoken',
        tokenSecret: 'secret-value',
        timeout: 10000,
      };

      const result = redactConfig(config);

      expect(result.baseUrl).toBe('https://example.com');
      // tokenId contains 'token' so it gets redacted
      expect(result.tokenId).toBe('[REDACTED]');
      expect(result.tokenSecret).toBe('[REDACTED]');
      expect(result.timeout).toBe(10000);
    });
  });
});
