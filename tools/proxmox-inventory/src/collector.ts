/**
 * Main collector orchestration
 */

import type {
  InventoryExport,
  InventoryWarning,
  NormalizedSystem,
  SystemRelationship,
} from './types.js';
import { ProxmoxClient } from './client.js';
import {
  normalizeNode,
  normalizeQemuVm,
  normalizeLxcContainer,
  normalizeStorage,
  createHostedOnRelationship,
  createStorageRelationship,
  deduplicateSystems,
  deduplicateRelationships,
} from './normalize.js';

export class ProxmoxCollector {
  private client: ProxmoxClient;
  private warnings: InventoryWarning[] = [];

  constructor(client: ProxmoxClient) {
    this.client = client;
  }

  /**
   * Add a warning to the collection
   */
  private addWarning(message: string, context: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM') {
    this.warnings.push({ message, context, severity });
  }

  /**
   * Collect complete inventory from Proxmox
   */
  async collect(): Promise<InventoryExport> {
    const startTime = Date.now();
    
    // Test connection first
    console.log('Testing connection to Proxmox API...');
    const connected = await this.client.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Proxmox API. Please check your configuration.');
    }
    console.log('✓ Connected successfully');

    // Get version info
    console.log('Fetching Proxmox version...');
    let version: string | null = null;
    try {
      const versionInfo = await this.client.getVersion();
      version = versionInfo.version || null;
      console.log(`✓ Proxmox version: ${version || 'unknown'}`);
    } catch (error) {
      this.addWarning('Could not retrieve Proxmox version', 'version', 'LOW');
    }

    // Check cluster status
    console.log('Checking cluster configuration...');
    let clusterName = 'proxmox-standalone';
    try {
      const clusterStatus = await this.client.getClusterStatus();
      const clusterInfo = clusterStatus.find(item => item.type === 'cluster');
      if (clusterInfo?.name) {
        clusterName = clusterInfo.name;
        console.log(`✓ Cluster detected: ${clusterName}`);
      } else {
        console.log('✓ Standalone node configuration');
      }
    } catch (error) {
      this.addWarning('Could not retrieve cluster status', 'cluster', 'LOW');
      console.log('✓ Assuming standalone configuration');
    }

    const systems: NormalizedSystem[] = [];
    const relationships: SystemRelationship[] = [];

    // Get all nodes
    console.log('Collecting nodes...');
    try {
      const nodes = await this.client.getNodes();
      console.log(`✓ Found ${nodes.length} node(s)`);
      
      for (const node of nodes) {
        systems.push(normalizeNode(node));
      }
    } catch (error) {
      this.addWarning(
        `Failed to collect nodes: ${error instanceof Error ? error.message : 'unknown error'}`,
        'nodes',
        'HIGH'
      );
      throw error;
    }

    // Get all resources (VMs, containers, etc.)
    console.log('Collecting VMs and containers...');
    try {
      const resources = await this.client.getResources();
      
      const qemuVms = resources.filter(r => r.type === 'qemu');
      const lxcContainers = resources.filter(r => r.type === 'lxc');
      
      console.log(`✓ Found ${qemuVms.length} VM(s) and ${lxcContainers.length} container(s)`);

      // Process QEMU VMs
      for (const vm of qemuVms) {
        if (!vm.vmid || !vm.node) {
          this.addWarning(
            `Skipping VM with missing VMID or node: ${JSON.stringify(vm)}`,
            'qemu',
            'MEDIUM'
          );
          continue;
        }

        systems.push(normalizeQemuVm(vm));
        relationships.push(createHostedOnRelationship('vm', vm.node, vm.vmid));
      }

      // Process LXC containers
      for (const container of lxcContainers) {
        if (!container.vmid || !container.node) {
          this.addWarning(
            `Skipping container with missing VMID or node: ${JSON.stringify(container)}`,
            'lxc',
            'MEDIUM'
          );
          continue;
        }

        systems.push(normalizeLxcContainer(container));
        relationships.push(createHostedOnRelationship('lxc', container.node, container.vmid));
      }
    } catch (error) {
      this.addWarning(
        `Failed to collect resources: ${error instanceof Error ? error.message : 'unknown error'}`,
        'resources',
        'HIGH'
      );
      throw error;
    }

    // Get storage for each node
    console.log('Collecting storage...');
    let totalStorage = 0;
    for (const system of systems) {
      if (system.type === 'PROXMOX_HOST' && system.name) {
        try {
          const storageList = await this.client.getNodeStorage(system.name);
          totalStorage += storageList.length;
          
          for (const storage of storageList) {
            systems.push(normalizeStorage(storage, system.name));
            relationships.push(createStorageRelationship(storage.storage, system.name));
          }
        } catch (error) {
          this.addWarning(
            `Could not retrieve storage for node ${system.name}`,
            'storage',
            'MEDIUM'
          );
        }
      }
    }
    console.log(`✓ Found ${totalStorage} storage resource(s)`);

    // Deduplicate
    const uniqueSystems = deduplicateSystems(systems);
    const uniqueRelationships = deduplicateRelationships(relationships);

    const duration = Date.now() - startTime;
    console.log(`✓ Collection completed in ${duration}ms`);

    return {
      schemaVersion: '1.0',
      generatedAt: new Date().toISOString(),
      source: {
        type: 'PROXMOX',
        name: clusterName,
        version,
      },
      systems: uniqueSystems,
      relationships: uniqueRelationships,
      warnings: this.warnings,
    };
  }

  /**
   * Get warnings collected during the process
   */
  getWarnings(): InventoryWarning[] {
    return this.warnings;
  }
}
