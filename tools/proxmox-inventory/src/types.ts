/**
 * Core type definitions for Proxmox inventory collector
 */

// Normalized system types
export type SystemType = 'PROXMOX_HOST' | 'VIRTUAL_MACHINE' | 'CONTAINER' | 'STORAGE';
export type SystemStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'UNKNOWN';
export type RelationshipType = 'HOSTED_ON' | 'ATTACHED_TO';
export type WarningSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NormalizedSystem {
  externalId: string;
  name: string;
  type: SystemType;
  status: SystemStatus;
  hostname: string | null;
  description: string | null;
  platform: string;
  platformVersion: string | null;
  vmId: number | null;
  nodeName: string | null;
  cpuAllocated: number | null;
  cpuUsagePercent: number | null;
  memoryAllocatedBytes: number | null;
  memoryUsedBytes: number | null;
  storageAllocatedBytes: number | null;
  storageUsedBytes: number | null;
  metadata: Record<string, unknown>;
}

export interface SystemRelationship {
  sourceExternalId: string;
  targetExternalId: string;
  type: RelationshipType;
}

export interface InventoryWarning {
  message: string;
  context: string;
  severity?: WarningSeverity;
}

export interface InventoryExport {
  schemaVersion: string;
  generatedAt: string;
  source: {
    type: 'PROXMOX';
    name: string;
    version: string | null;
  };
  systems: NormalizedSystem[];
  relationships: SystemRelationship[];
  warnings: InventoryWarning[];
}

// Proxmox API types
export interface ProxmoxConfig {
  baseUrl: string;
  tokenId: string;
  tokenSecret: string;
  caCertPath?: string;
  allowInsecureTls: boolean;
  requestTimeoutMs: number;
  outputPath: string;
}

export interface ProxmoxVersion {
  version?: string;
  release?: string;
  repoid?: string;
}

export interface ProxmoxNode {
  node: string;
  status: 'online' | 'offline' | 'unknown';
  type?: string;
  level?: string;
  id?: string;
  maxcpu?: number;
  cpu?: number;
  maxmem?: number;
  mem?: number;
  uptime?: number;
  [key: string]: unknown;
}

export interface ProxmoxResource {
  id: string;
  type: 'qemu' | 'lxc' | 'node' | 'storage';
  node?: string;
  status?: 'running' | 'stopped' | 'paused' | 'active' | 'available' | string;
  name?: string;
  vmid?: number;
  maxcpu?: number;
  cpu?: number;
  maxmem?: number;
  mem?: number;
  maxdisk?: number;
  disk?: number;
  uptime?: number;
  template?: number;
  [key: string]: unknown;
}

export interface ProxmoxStorage {
  storage: string;
  type: string;
  content?: string;
  active?: number;
  enabled?: number;
  shared?: number;
  total?: number;
  used?: number;
  avail?: number;
  [key: string]: unknown;
}

export interface ProxmoxClusterStatus {
  type?: string;
  name?: string;
  version?: number;
  nodes?: number;
  quorate?: number;
  [key: string]: unknown;
}
