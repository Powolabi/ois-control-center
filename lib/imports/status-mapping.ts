import { SystemStatus } from "@prisma/client"

export function mapProxmoxStatusToSystemStatus(
  proxmoxStatus: "ONLINE" | "OFFLINE" | "WARNING" | "UNKNOWN"
): SystemStatus {
  const statusMap: Record<string, SystemStatus> = {
    ONLINE: "ONLINE",
    OFFLINE: "OFFLINE",
    WARNING: "WARNING",
    UNKNOWN: "UNKNOWN",
  }

  return statusMap[proxmoxStatus] || "UNKNOWN"
}

export function mapProxmoxTypeToSystemType(
  proxmoxType: "PROXMOX_HOST" | "VIRTUAL_MACHINE" | "CONTAINER" | "STORAGE"
): "PROXMOX_HOST" | "VIRTUAL_MACHINE" | "CONTAINER" | "STORAGE" {
  return proxmoxType
}

export function mapProxmoxTypeToExternalType(
  proxmoxType: "PROXMOX_HOST" | "VIRTUAL_MACHINE" | "CONTAINER" | "STORAGE"
): "PROXMOX_NODE" | "PROXMOX_VM" | "PROXMOX_CONTAINER" | "PROXMOX_STORAGE" {
  const typeMap: Record<string, any> = {
    PROXMOX_HOST: "PROXMOX_NODE",
    VIRTUAL_MACHINE: "PROXMOX_VM",
    CONTAINER: "PROXMOX_CONTAINER",
    STORAGE: "PROXMOX_STORAGE",
  }

  return typeMap[proxmoxType]
}
