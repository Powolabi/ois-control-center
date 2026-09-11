/**
 * Tests for normalization functions
 */

import { describe, it, expect } from '@jest/globals';
import {
  normalizeNode,
  normalizeQemuVm,
  normalizeLxcContainer,
  normalizeStorage,
  createHostedOnRelationship,
  createStorageRelationship,
  deduplicateSystems,
  deduplicateRelationships,
} from '../src/normalize.js';
import type { ProxmoxNode, ProxmoxResource, ProxmoxStorage } from '../src/types.js';

describe('Normalization', () => {
  describe('normalizeNode', () => {
    it('should normalize online node', () => {
      const node: ProxmoxNode = {
        node: 'pve-node-1',
        status: 'online',
        type: 'node',
        level: '',
        maxcpu: 8,
        cpu: 0.25,
        maxmem: 16777216000,
        mem: 8388608000,
        uptime: 864000,
      };

      const result = normalizeNode(node);

      expect(result.externalId).toBe('proxmox:node:pve-node-1');
      expect(result.name).toBe('pve-node-1');
      expect(result.type).toBe('PROXMOX_HOST');
      expect(result.status).toBe('ONLINE');
      expect(result.cpuAllocated).toBe(8);
      expect(result.cpuUsagePercent).toBe(25);
      expect(result.memoryAllocatedBytes).toBe(16777216000);
      expect(result.memoryUsedBytes).toBe(8388608000);
    });

    it('should normalize offline node', () => {
      const node: ProxmoxNode = {
        node: 'pve-node-2',
        status: 'offline',
        type: 'node',
        maxcpu: 4,
        cpu: 0,
        maxmem: 8388608000,
        mem: 0,
      };

      const result = normalizeNode(node);

      expect(result.status).toBe('OFFLINE');
      expect(result.cpuUsagePercent).toBe(0);
    });

    it('should handle missing optional fields', () => {
      const node: ProxmoxNode = {
        node: 'pve-node-3',
        status: 'online',
      };

      const result = normalizeNode(node);

      expect(result.cpuAllocated).toBeNull();
      expect(result.cpuUsagePercent).toBeNull();
      expect(result.memoryAllocatedBytes).toBeNull();
    });
  });

  describe('normalizeQemuVm', () => {
    it('should normalize running VM', () => {
      const vm: ProxmoxResource = {
        id: 'qemu/101',
        type: 'qemu',
        node: 'pve-node-1',
        vmid: 101,
        name: 'web-server',
        status: 'running',
        maxcpu: 2,
        cpu: 0.5,
        maxmem: 4294967296,
        mem: 2147483648,
        maxdisk: 53687091200,
        disk: 10737418240,
        uptime: 432000,
        template: 0,
      };

      const result = normalizeQemuVm(vm);

      expect(result.externalId).toBe('proxmox:vm:pve-node-1:101');
      expect(result.name).toBe('web-server');
      expect(result.type).toBe('VIRTUAL_MACHINE');
      expect(result.status).toBe('ONLINE');
      expect(result.vmId).toBe(101);
      expect(result.nodeName).toBe('pve-node-1');
      expect(result.cpuAllocated).toBe(2);
      expect(result.cpuUsagePercent).toBe(50);
      expect(result.storageAllocatedBytes).toBe(53687091200);
      expect(result.storageUsedBytes).toBe(10737418240);
    });

    it('should normalize stopped VM', () => {
      const vm: ProxmoxResource = {
        id: 'qemu/102',
        type: 'qemu',
        node: 'pve-node-1',
        vmid: 102,
        name: 'app-server',
        status: 'stopped',
        maxcpu: 2,
        cpu: 0,
        maxmem: 4294967296,
        mem: 0,
        template: 0,
      };

      const result = normalizeQemuVm(vm);

      expect(result.status).toBe('OFFLINE');
      expect(result.cpuUsagePercent).toBe(0);
    });

    it('should handle VM without name', () => {
      const vm: ProxmoxResource = {
        id: 'qemu/103',
        type: 'qemu',
        node: 'pve-node-1',
        vmid: 103,
        status: 'running',
      };

      const result = normalizeQemuVm(vm);

      expect(result.name).toBe('VM-103');
    });
  });

  describe('normalizeLxcContainer', () => {
    it('should normalize running container', () => {
      const container: ProxmoxResource = {
        id: 'lxc/201',
        type: 'lxc',
        node: 'pve-node-1',
        vmid: 201,
        name: 'database-ct',
        status: 'running',
        maxcpu: 4,
        cpu: 0.75,
        maxmem: 8589934592,
        mem: 6442450944,
        maxdisk: 107374182400,
        disk: 32212254720,
        uptime: 86400,
        template: 0,
      };

      const result = normalizeLxcContainer(container);

      expect(result.externalId).toBe('proxmox:lxc:pve-node-1:201');
      expect(result.name).toBe('database-ct');
      expect(result.type).toBe('CONTAINER');
      expect(result.status).toBe('ONLINE');
      expect(result.vmId).toBe(201);
      expect(result.cpuUsagePercent).toBe(75);
    });

    it('should handle container without name', () => {
      const container: ProxmoxResource = {
        id: 'lxc/202',
        type: 'lxc',
        node: 'pve-node-1',
        vmid: 202,
        status: 'running',
      };

      const result = normalizeLxcContainer(container);

      expect(result.name).toBe('CT-202');
    });
  });

  describe('normalizeStorage', () => {
    it('should normalize active storage', () => {
      const storage: ProxmoxStorage = {
        storage: 'local-lvm',
        type: 'lvmthin',
        content: 'images,rootdir',
        active: 1,
        enabled: 1,
        shared: 0,
        total: 536870912000,
        used: 214748364800,
        avail: 322122547200,
      };

      const result = normalizeStorage(storage, 'pve-node-1');

      expect(result.externalId).toBe('proxmox:storage:pve-node-1:local-lvm');
      expect(result.name).toBe('local-lvm');
      expect(result.type).toBe('STORAGE');
      expect(result.status).toBe('ONLINE');
      expect(result.nodeName).toBe('pve-node-1');
      expect(result.storageAllocatedBytes).toBe(536870912000);
      expect(result.storageUsedBytes).toBe(214748364800);
      expect(result.description).toBe('lvmthin');
    });

    it('should normalize inactive storage', () => {
      const storage: ProxmoxStorage = {
        storage: 'backup',
        type: 'dir',
        active: 0,
      };

      const result = normalizeStorage(storage, 'pve-node-1');

      expect(result.status).toBe('OFFLINE');
    });
  });

  describe('createHostedOnRelationship', () => {
    it('should create VM relationship', () => {
      const rel = createHostedOnRelationship('vm', 'pve-node-1', 101);

      expect(rel.sourceExternalId).toBe('proxmox:vm:pve-node-1:101');
      expect(rel.targetExternalId).toBe('proxmox:node:pve-node-1');
      expect(rel.type).toBe('HOSTED_ON');
    });

    it('should create LXC relationship', () => {
      const rel = createHostedOnRelationship('lxc', 'pve-node-1', 201);

      expect(rel.sourceExternalId).toBe('proxmox:lxc:pve-node-1:201');
      expect(rel.targetExternalId).toBe('proxmox:node:pve-node-1');
      expect(rel.type).toBe('HOSTED_ON');
    });
  });

  describe('createStorageRelationship', () => {
    it('should create storage relationship', () => {
      const rel = createStorageRelationship('local-lvm', 'pve-node-1');

      expect(rel.sourceExternalId).toBe('proxmox:storage:pve-node-1:local-lvm');
      expect(rel.targetExternalId).toBe('proxmox:node:pve-node-1');
      expect(rel.type).toBe('ATTACHED_TO');
    });
  });

  describe('deduplicateSystems', () => {
    it('should remove duplicate systems by external ID', () => {
      const systems = [
        {
          externalId: 'proxmox:node:pve-1',
          name: 'pve-1',
          type: 'PROXMOX_HOST' as const,
          status: 'ONLINE' as const,
          hostname: null,
          description: null,
          platform: 'Proxmox',
          platformVersion: null,
          vmId: null,
          nodeName: null,
          cpuAllocated: null,
          cpuUsagePercent: null,
          memoryAllocatedBytes: null,
          memoryUsedBytes: null,
          storageAllocatedBytes: null,
          storageUsedBytes: null,
          metadata: {},
        },
        {
          externalId: 'proxmox:node:pve-1',
          name: 'pve-1-duplicate',
          type: 'PROXMOX_HOST' as const,
          status: 'ONLINE' as const,
          hostname: null,
          description: null,
          platform: 'Proxmox',
          platformVersion: null,
          vmId: null,
          nodeName: null,
          cpuAllocated: null,
          cpuUsagePercent: null,
          memoryAllocatedBytes: null,
          memoryUsedBytes: null,
          storageAllocatedBytes: null,
          storageUsedBytes: null,
          metadata: {},
        },
      ];

      const result = deduplicateSystems(systems);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('pve-1');
    });
  });

  describe('deduplicateRelationships', () => {
    it('should remove duplicate relationships', () => {
      const relationships = [
        {
          sourceExternalId: 'proxmox:vm:pve-1:101',
          targetExternalId: 'proxmox:node:pve-1',
          type: 'HOSTED_ON' as const,
        },
        {
          sourceExternalId: 'proxmox:vm:pve-1:101',
          targetExternalId: 'proxmox:node:pve-1',
          type: 'HOSTED_ON' as const,
        },
      ];

      const result = deduplicateRelationships(relationships);

      expect(result).toHaveLength(1);
    });
  });
});
