/**
 * Configuration management for Proxmox collector
 */

import { config as loadEnv } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ProxmoxConfig } from './types.js';
import { createSafeError } from './redact.js';

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): ProxmoxConfig {
  // Load .env file if it exists
  loadEnv();

  const baseUrl = process.env.PROXMOX_BASE_URL;
  const tokenId = process.env.PROXMOX_TOKEN_ID;
  const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;

  if (!baseUrl) {
    throw createSafeError('PROXMOX_BASE_URL environment variable is required');
  }

  if (!tokenId) {
    throw createSafeError('PROXMOX_TOKEN_ID environment variable is required');
  }

  if (!tokenSecret) {
    throw createSafeError('PROXMOX_TOKEN_SECRET environment variable is required');
  }

  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    throw createSafeError('PROXMOX_BASE_URL must be a valid URL');
  }

  // Validate token ID format (should be user@realm!tokenname)
  if (!tokenId.includes('@') || !tokenId.includes('!')) {
    throw createSafeError(
      'PROXMOX_TOKEN_ID must be in format: user@realm!tokenname'
    );
  }

  const caCertPath = process.env.PROXMOX_CA_CERT_PATH;
  const allowInsecureTls = process.env.PROXMOX_ALLOW_INSECURE_TLS === 'true';
  const requestTimeoutMs = parseInt(
    process.env.PROXMOX_REQUEST_TIMEOUT_MS || '10000',
    10
  );
  const outputPath = process.env.PROXMOX_OUTPUT_PATH || './output/proxmox-inventory.json';

  // Validate CA cert if provided
  if (caCertPath) {
    try {
      readFileSync(resolve(caCertPath), 'utf-8');
    } catch (error) {
      throw createSafeError(
        `Failed to read CA certificate from ${caCertPath}`,
        error
      );
    }
  }

  // Warn about insecure TLS
  if (allowInsecureTls) {
    console.warn('⚠️  WARNING: TLS certificate verification is disabled!');
    console.warn('⚠️  This should only be used in development environments.');
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
    tokenId,
    tokenSecret,
    caCertPath,
    allowInsecureTls,
    requestTimeoutMs,
    outputPath,
  };
}

/**
 * Get a safe version of config for logging (with secrets redacted)
 */
export function getSafeConfig(config: ProxmoxConfig): Partial<ProxmoxConfig> {
  return {
    baseUrl: config.baseUrl.replace(/\/\/.*@/, '//[REDACTED]@'), // Redact any embedded credentials
    tokenId: config.tokenId.split('!')[0] + '![REDACTED]', // Show user@realm but hide token name
    tokenSecret: '[REDACTED]',
    caCertPath: config.caCertPath,
    allowInsecureTls: config.allowInsecureTls,
    requestTimeoutMs: config.requestTimeoutMs,
    outputPath: config.outputPath,
  };
}
