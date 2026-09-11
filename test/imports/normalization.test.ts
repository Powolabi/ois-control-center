import { describe, it, expect } from "vitest"
import {
  normalizeProxmoxExport,
  shouldUpdateField,
  calculateFieldChanges,
} from "@/lib/imports/normalization"
import { ProxmoxExport } from "@/lib/imports/types"

describe("Normalization", () => {
  describe("normalizeProxmoxExport", () => {
    it("should normalize a basic Proxmox export", () => {
      const exportData: ProxmoxExport = {
        schemaVersion: "1.0",
        generatedAt: "2026-09-11T15:30:00.000Z",
        source: {
          type: "PROXMOX",
          name: "test-cluster",
          version: "8.1.3",
        },
        systems: [
          {
            externalId: "proxmox:node:pve-node-1",
            name: "pve-node-1",
            type: "PROXMOX_HOST",
            status: "ONLINE",
            hostname: "pve-node-1",
            description: null,
            platform: "Proxmox",
            platformVersion: "8.1.3",
            vmId: null,
            nodeName: null,
            cpuAllocated: 8,
            cpuUsagePercent: 15.0,
            memoryAllocatedBytes: 16777216000,
            memoryUsedBytes: 8388608000,
            storageAllocatedBytes: null,
            storageUsedBytes: null,
            metadata: {
              type: "node",
              uptime: 864000,
            },
          },
        ],
        relationships: [],
        warnings: [],
      }

      const normalized = normalizeProxmoxExport(exportData)

      expect(normalized).toHaveLength(1)
      expect(normalized[0].externalId).toBe("proxmox:node:pve-node-1")
      expect(normalized[0].name).toBe("pve-node-1")
      expect(normalized[0].type).toBe("PROXMOX_HOST")
      expect(normalized[0].status).toBe("ONLINE")
      expect(normalized[0].cpuAllocation).toBe(8)
      expect(normalized[0].memoryAllocation).toBeGreaterThan(0)
    })

    it("should convert memory from bytes to MB", () => {
      const exportData: ProxmoxExport = {
        schemaVersion: "1.0",
        generatedAt: "2026-09-11T15:30:00.000Z",
        source: { type: "PROXMOX", name: "test", version: null },
        systems: [
          {
            externalId: "proxmox:vm:test:100",
            name: "test-vm",
            type: "VIRTUAL_MACHINE",
            status: "ONLINE",
            hostname: null,
            description: null,
            platform: "Proxmox",
            platformVersion: null,
            vmId: 100,
            nodeName: "pve-node-1",
            cpuAllocated: 2,
            cpuUsagePercent: null,
            memoryAllocatedBytes: 4294967296, // 4GB
            memoryUsedBytes: null,
            storageAllocatedBytes: 53687091200, // 50GB
            storageUsedBytes: null,
            metadata: {},
          },
        ],
        relationships: [],
        warnings: [],
      }

      const normalized = normalizeProxmoxExport(exportData)

      expect(normalized[0].memoryAllocation).toBe(4096)
      expect(normalized[0].storageAllocation).toBe(50)
    })

    it("should establish parent relationships", () => {
      const exportData: ProxmoxExport = {
        schemaVersion: "1.0",
        generatedAt: "2026-09-11T15:30:00.000Z",
        source: { type: "PROXMOX", name: "test", version: null },
        systems: [
          {
            externalId: "proxmox:node:pve-node-1",
            name: "pve-node-1",
            type: "PROXMOX_HOST",
            status: "ONLINE",
            hostname: null,
            description: null,
            platform: "Proxmox",
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
            externalId: "proxmox:vm:pve-node-1:100",
            name: "test-vm",
            type: "VIRTUAL_MACHINE",
            status: "ONLINE",
            hostname: null,
            description: null,
            platform: "Proxmox",
            platformVersion: null,
            vmId: 100,
            nodeName: "pve-node-1",
            cpuAllocated: null,
            cpuUsagePercent: null,
            memoryAllocatedBytes: null,
            memoryUsedBytes: null,
            storageAllocatedBytes: null,
            storageUsedBytes: null,
            metadata: {},
          },
        ],
        relationships: [
          {
            sourceExternalId: "proxmox:vm:pve-node-1:100",
            targetExternalId: "proxmox:node:pve-node-1",
            type: "HOSTED_ON",
          },
        ],
        warnings: [],
      }

      const normalized = normalizeProxmoxExport(exportData)
      const vm = normalized.find((s) => s.vmContainerId === "100")

      expect(vm?.parentExternalId).toBe("proxmox:node:pve-node-1")
    })
  })

  describe("shouldUpdateField", () => {
    it("should allow updating import-owned fields", () => {
      expect(shouldUpdateField("status", "OFFLINE", "ONLINE")).toBe(true)
      expect(shouldUpdateField("cpuAllocation", 2, 4)).toBe(true)
      expect(shouldUpdateField("memoryAllocation", 4096, 8192)).toBe(true)
    })

    it("should not allow updating manually-owned fields", () => {
      expect(shouldUpdateField("description", "old", "new")).toBe(false)
      expect(shouldUpdateField("notes", "old", "new")).toBe(false)
      expect(shouldUpdateField("tags", ["a"], ["b"])).toBe(false)
    })

    it("should not overwrite with null values", () => {
      expect(shouldUpdateField("status", "ONLINE", null)).toBe(false)
      expect(shouldUpdateField("cpuAllocation", 4, null)).toBe(false)
    })

    it("should not update if values are the same", () => {
      const result = shouldUpdateField("status", "ONLINE", "ONLINE")
      expect(calculateFieldChanges({ status: "ONLINE" }, { status: "ONLINE" } as any)).toEqual({})
    })
  })

  describe("calculateFieldChanges", () => {
    it("should detect changed fields", () => {
      const existing = {
        status: "OFFLINE",
        cpuAllocation: 2,
        memoryAllocation: 4096,
      }

      const normalized = {
        status: "ONLINE",
        cpuAllocation: 4,
        memoryAllocation: 4096,
      } as any

      const changes = calculateFieldChanges(existing, normalized)

      expect(changes.status).toEqual({ old: "OFFLINE", new: "ONLINE" })
      expect(changes.cpuAllocation).toEqual({ old: 2, new: 4 })
      expect(changes.memoryAllocation).toBeUndefined()
    })

    it("should not include manually-owned fields", () => {
      const existing = {
        status: "ONLINE",
        description: "Old description",
      }

      const normalized = {
        status: "ONLINE",
        description: "New description",
      } as any

      const changes = calculateFieldChanges(existing, normalized)

      expect(changes.description).toBeUndefined()
    })
  })
})
