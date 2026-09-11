/**
 * Proxmox API client with read-only operations
 */

import https from 'https';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  ProxmoxConfig,
  ProxmoxVersion,
  ProxmoxNode,
  ProxmoxResource,
  ProxmoxStorage,
  ProxmoxClusterStatus,
} from './types.js';
import { createSafeError, redactUrl } from './redact.js';

export class ProxmoxClient {
  private config: ProxmoxConfig;
  private authHeader: string;
  private httpsAgent: https.Agent;

  constructor(config: ProxmoxConfig) {
    this.config = config;
    this.authHeader = `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`;
    
    // Configure HTTPS agent
    const agentOptions: https.AgentOptions = {};
    
    if (config.caCertPath) {
      agentOptions.ca = readFileSync(resolve(config.caCertPath), 'utf-8');
    }
    
    if (config.allowInsecureTls) {
      agentOptions.rejectUnauthorized = false;
    }
    
    this.httpsAgent = new https.Agent(agentOptions);
  }

  /**
   * Make a GET request to the Proxmox API
   */
  private async get<T>(path: string): Promise<T> {
    const url = `${this.config.baseUrl}/api2/json${path}`;
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || 8006,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json',
          },
          agent: this.httpsAgent,
          timeout: this.config.requestTimeoutMs,
        },
        (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.data !== undefined) {
                  resolve(parsed.data as T);
                } else {
                  resolve(parsed as T);
                }
              } catch (error) {
                reject(createSafeError(
                  `Failed to parse JSON response from ${redactUrl(url)}`,
                  error
                ));
              }
            } else if (res.statusCode === 401) {
              reject(createSafeError(
                'Authentication failed. Please check your API token credentials.'
              ));
            } else if (res.statusCode === 403) {
              reject(createSafeError(
                'Permission denied. Please ensure your API token has read permissions.'
              ));
            } else {
              reject(createSafeError(
                `HTTP ${res.statusCode} from ${redactUrl(url)}: ${data.substring(0, 200)}`
              ));
            }
          });
        }
      );
      
      req.on('error', (error) => {
        reject(createSafeError(
          `Network error connecting to ${redactUrl(url)}`,
          error
        ));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(createSafeError(
          `Request timeout after ${this.config.requestTimeoutMs}ms for ${redactUrl(url)}`
        ));
      });
      
      req.end();
    });
  }

  /**
   * Get Proxmox version information
   */
  async getVersion(): Promise<ProxmoxVersion> {
    try {
      return await this.get<ProxmoxVersion>('/version');
    } catch (error) {
      throw createSafeError('Failed to get Proxmox version', error);
    }
  }

  /**
   * Get cluster status (returns empty array for standalone nodes)
   */
  async getClusterStatus(): Promise<ProxmoxClusterStatus[]> {
    try {
      return await this.get<ProxmoxClusterStatus[]>('/cluster/status');
    } catch (error) {
      // Cluster status may not be available on standalone nodes
      return [];
    }
  }

  /**
   * Get all nodes in the cluster (or standalone node)
   */
  async getNodes(): Promise<ProxmoxNode[]> {
    try {
      return await this.get<ProxmoxNode[]>('/nodes');
    } catch (error) {
      throw createSafeError('Failed to get Proxmox nodes', error);
    }
  }

  /**
   * Get all resources (VMs, containers, nodes, storage)
   */
  async getResources(): Promise<ProxmoxResource[]> {
    try {
      return await this.get<ProxmoxResource[]>('/cluster/resources');
    } catch (error) {
      throw createSafeError('Failed to get Proxmox resources', error);
    }
  }

  /**
   * Get storage for a specific node
   */
  async getNodeStorage(nodeName: string): Promise<ProxmoxStorage[]> {
    try {
      return await this.get<ProxmoxStorage[]>(`/nodes/${nodeName}/storage`);
    } catch (error) {
      // Storage may not be available for offline nodes
      console.warn(`Warning: Could not get storage for node ${nodeName}`);
      return [];
    }
  }

  /**
   * Test connection and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getVersion();
      return true;
    } catch {
      return false;
    }
  }
}
