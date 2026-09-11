/**
 * Tests for configuration management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load valid configuration from environment', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.baseUrl).toBe('https://proxmox.example.com:8006');
    expect(config.tokenId).toBe('user@pam!mytoken');
    expect(config.tokenSecret).toBe('secret-value');
    expect(config.allowInsecureTls).toBe(false);
    expect(config.requestTimeoutMs).toBe(10000);
  });

  it('should remove trailing slash from base URL', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006/';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.baseUrl).toBe('https://proxmox.example.com:8006');
  });

  it('should parse optional configuration', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';
    process.env.PROXMOX_ALLOW_INSECURE_TLS = 'true';
    process.env.PROXMOX_REQUEST_TIMEOUT_MS = '5000';
    process.env.PROXMOX_OUTPUT_PATH = '/custom/output.json';

    const { loadConfig } = await import('../src/config.js');
    const config = loadConfig();

    expect(config.allowInsecureTls).toBe(true);
    expect(config.requestTimeoutMs).toBe(5000);
    expect(config.outputPath).toBe('/custom/output.json');
  });

  it('should throw error when base URL is missing', async () => {
    delete process.env.PROXMOX_BASE_URL;
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('PROXMOX_BASE_URL');
  });

  it('should throw error when token ID is missing', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    delete process.env.PROXMOX_TOKEN_ID;
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('PROXMOX_TOKEN_ID');
  });

  it('should throw error when token secret is missing', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    delete process.env.PROXMOX_TOKEN_SECRET;

    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('PROXMOX_TOKEN_SECRET');
  });

  it('should throw error when base URL is invalid', async () => {
    process.env.PROXMOX_BASE_URL = 'not-a-valid-url';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('valid URL');
  });

  it('should throw error when token ID format is invalid', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    process.env.PROXMOX_TOKEN_ID = 'invalid-format';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig } = await import('../src/config.js');

    expect(() => loadConfig()).toThrow('user@realm!tokenname');
  });

  it('should redact sensitive values in safe config', async () => {
    process.env.PROXMOX_BASE_URL = 'https://proxmox.example.com:8006';
    process.env.PROXMOX_TOKEN_ID = 'user@pam!mytoken';
    process.env.PROXMOX_TOKEN_SECRET = 'secret-value';

    const { loadConfig, getSafeConfig } = await import('../src/config.js');
    const config = loadConfig();
    const safeConfig = getSafeConfig(config);

    expect(safeConfig.tokenId).toContain('[REDACTED]');
    expect(safeConfig.tokenId).not.toContain('mytoken');
    expect(safeConfig.tokenSecret).toBe('[REDACTED]');
    expect(safeConfig.baseUrl).toBe('https://proxmox.example.com:8006');
  });
});
