/**
 * Normalize Proxmox API responses to standard inventory format
 */

import type {
  NormalizedSystem,
  SystemRelationship,
  SystemStatus,
  ProxmoxNode,
  ProxmoxResource,
  ProxmoxStorage,
} from './types.js';

/**
 * Map Proxmox status to normalized status
 */
function mapStatus(proxmoxStatus: string | undefined): SystemStatus {
  if (!proxmoxStatus) {
    return 'UNKNOWN';
  }

  const status = proxmoxStatus.toLowerCase();
  
  if (status === 'online' || status === 'running' || status === 'active' || status === 'available') {
    return 'ONLINE';
  }
  
  if (status === 'offline' || status === 'stopped') {
    return 'OFFLINE';
  }
  
  if (status === 'paused' || status === 'suspended') {
    return 'WARNING';
  }
  
  return 'UNKNOWN';
}

/**
 * Create a stable external ID for a Proxmox resource
 */
function createExternalId(type: string, identifier: string): string {
  return `proxmox:${type}:${identifier}`;
}

/**
 * Normalize a Proxmox node to a system
 */
export function normalizeNode(node: ProxmoxNode): NormalizedSystem {
  return {
    externalId: createExternalId('node', node.node),
    name: node.node,
    type: 'PROXMOX_HOST',
    status: mapStatus(node.status),
    hostname: node.node,
    description: null,
    platform: 'Proxmox',
    platformVersion: null,
    vmId: null,
    nodeName: null,
    cpuAllocated: node.maxcpu || null,
    cpuUsagePercent: node.cpu !== undefined && node.maxcpu 
      ? Math.round((node.cpu * 100) * 100) / 100 
      : null,
    memoryAllocatedBytes: node.maxmem || null,
    memoryUsedBytes: node.mem || null,
    storageAllocatedBytes: null,
    storageUsedBytes: null,
    metadata: {
      type: node.type,
      level: node.level,
      uptime: node.uptime,
    },
  };
}

/**
 * Normalize a QEMU VM to a system
 */
export function normalizeQemuVm(resource: ProxmoxResource): NormalizedSystem {
  const vmid = resource.vmid || 0;
  const node = resource.node || 'unknown';
  
  return {
    externalId: createExternalId('vm', `${node}:${vmid}`),
    name: resource.name || `VM-${vmid}`,
    type: 'VIRTUAL_MACHINE',
    status: mapStatus(resource.status),
    hostname: null,
    description: null,
    platform: 'Proxmox',
    platformVersion: null,
    vmId: vmid,
    nodeName: node,
    cpuAllocated: resource.maxcpu || null,
    cpuUsagePercent: resource.cpu !== undefined && resource.cpu !== null 
      ? Math.round((resource.cpu * 100) * 100) / 100 
      : null,
    memoryAllocatedBytes: resource.maxmem || null,
    memoryUsedBytes: resource.mem || null,
    storageAllocatedBytes: resource.maxdisk || null,
    storageUsedBytes: resource.disk || null,
    metadata: {
      type: 'qemu',
      template: resource.template === 1,
      uptime: resource.uptime,
    },
  };
}

/**
 * Normalize an LXC container to a system
 */
export function normalizeLxcContainer(resource: ProxmoxResource): NormalizedSystem {
  const vmid = resource.vmid || 0;
  const node = resource.node || 'unknown';
  
  return {
    externalId: createExternalId('lxc', `${node}:${vmid}`),
    name: resource.name || `CT-${vmid}`,
    type: 'CONTAINER',
    status: mapStatus(resource.status),
    hostname: null,
    description: null,
    platform: 'Proxmox',
    platformVersion: null,
    vmId: vmid,
    nodeName: node,
    cpuAllocated: resource.maxcpu || null,
    cpuUsagePercent: resource.cpu !== undefined && resource.cpu !== null 
      ? Math.round((resource.cpu * 100) * 100) / 100 
      : null,
    memoryAllocatedBytes: resource.maxmem || null,
    memoryUsedBytes: resource.mem || null,
    storageAllocatedBytes: resource.maxdisk || null,
    storageUsedBytes: resource.disk || null,
    metadata: {
      type: 'lxc',
      template: resource.template === 1,
      uptime: resource.uptime,
    },
  };
}

/**
 * Normalize a storage resource to a system
 */
export function normalizeStorage(
  storage: ProxmoxStorage,
  nodeName: string
): NormalizedSystem {
  const active = storage.active === 1;
  const status = active ? 'ONLINE' : 'OFFLINE';
  
  return {
    externalId: createExternalId('storage', `${nodeName}:${storage.storage}`),
    name: storage.storage,
    type: 'STORAGE',
    status,
    hostname: null,
    description: storage.type,
    platform: 'Proxmox',
    platformVersion: null,
    vmId: null,
    nodeName,
    cpuAllocated: null,
    cpuUsagePercent: null,
    memoryAllocatedBytes: null,
    memoryUsedBytes: null,
    storageAllocatedBytes: storage.total || null,
    storageUsedBytes: storage.used || null,
    metadata: {
      type: storage.type,
      content: storage.content,
      shared: storage.shared === 1,
      enabled: storage.enabled === 1,
      available: storage.avail,
    },
  };
}

/**
 * Create a relationship between a guest and its host node
 */
export function createHostedOnRelationship(
  guestType: 'vm' | 'lxc',
  nodeName: string,
  vmid: number
): SystemRelationship {
  return {
    sourceExternalId: createExternalId(guestType, `${nodeName}:${vmid}`),
    targetExternalId: createExternalId('node', nodeName),
    type: 'HOSTED_ON',
  };
}

/**
 * Create a relationship between storage and its node
 */
export function createStorageRelationship(
  storageName: string,
  nodeName: string
): SystemRelationship {
  return {
    sourceExternalId: createExternalId('storage', `${nodeName}:${storageName}`),
    targetExternalId: createExternalId('node', nodeName),
    type: 'ATTACHED_TO',
  };
}

/**
 * Deduplicate systems by external ID
 */
export function deduplicateSystems(systems: NormalizedSystem[]): NormalizedSystem[] {
  const seen = new Set<string>();
  const deduplicated: NormalizedSystem[] = [];
  
  for (const system of systems) {
    if (!seen.has(system.externalId)) {
      seen.add(system.externalId);
      deduplicated.push(system);
    }
  }
  
  return deduplicated;
}

/**
 * Deduplicate relationships
 */
export function deduplicateRelationships(
  relationships: SystemRelationship[]
): SystemRelationship[] {
  const seen = new Set<string>();
  const deduplicated: SystemRelationship[] = [];
  
  for (const rel of relationships) {
    const key = `${rel.sourceExternalId}:${rel.targetExternalId}:${rel.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(rel);
    }
  }
  
  return deduplicated;
}
