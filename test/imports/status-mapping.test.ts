import { describe, it, expect } from "vitest"
import {
  mapProxmoxStatusToSystemStatus,
  mapProxmoxTypeToSystemType,
  mapProxmoxTypeToExternalType,
} from "@/lib/imports/status-mapping"

describe("Status Mapping", () => {
  describe("mapProxmoxStatusToSystemStatus", () => {
    it("should map ONLINE to ONLINE", () => {
      expect(mapProxmoxStatusToSystemStatus("ONLINE")).toBe("ONLINE")
    })

    it("should map OFFLINE to OFFLINE", () => {
      expect(mapProxmoxStatusToSystemStatus("OFFLINE")).toBe("OFFLINE")
    })

    it("should map WARNING to WARNING", () => {
      expect(mapProxmoxStatusToSystemStatus("WARNING")).toBe("WARNING")
    })

    it("should map UNKNOWN to UNKNOWN", () => {
      expect(mapProxmoxStatusToSystemStatus("UNKNOWN")).toBe("UNKNOWN")
    })
  })

  describe("mapProxmoxTypeToSystemType", () => {
    it("should map PROXMOX_HOST", () => {
      expect(mapProxmoxTypeToSystemType("PROXMOX_HOST")).toBe("PROXMOX_HOST")
    })

    it("should map VIRTUAL_MACHINE", () => {
      expect(mapProxmoxTypeToSystemType("VIRTUAL_MACHINE")).toBe("VIRTUAL_MACHINE")
    })

    it("should map CONTAINER", () => {
      expect(mapProxmoxTypeToSystemType("CONTAINER")).toBe("CONTAINER")
    })

    it("should map STORAGE", () => {
      expect(mapProxmoxTypeToSystemType("STORAGE")).toBe("STORAGE")
    })
  })

  describe("mapProxmoxTypeToExternalType", () => {
    it("should map PROXMOX_HOST to PROXMOX_NODE", () => {
      expect(mapProxmoxTypeToExternalType("PROXMOX_HOST")).toBe("PROXMOX_NODE")
    })

    it("should map VIRTUAL_MACHINE to PROXMOX_VM", () => {
      expect(mapProxmoxTypeToExternalType("VIRTUAL_MACHINE")).toBe("PROXMOX_VM")
    })

    it("should map CONTAINER to PROXMOX_CONTAINER", () => {
      expect(mapProxmoxTypeToExternalType("CONTAINER")).toBe("PROXMOX_CONTAINER")
    })

    it("should map STORAGE to PROXMOX_STORAGE", () => {
      expect(mapProxmoxTypeToExternalType("STORAGE")).toBe("PROXMOX_STORAGE")
    })
  })
})
