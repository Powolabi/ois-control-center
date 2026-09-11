import { SystemType, SystemStatus, Criticality, Environment } from "@prisma/client"

export interface ProxmoxExport {
  schemaVersion: string
  generatedAt: string
  source: {
    type: "PROXMOX"
    name: string
    version?: string | null
  }
  systems: ProxmoxSystem[]
  relationships: ProxmoxRelationship[]
  warnings: ProxmoxWarning[]
}

export interface ProxmoxSystem {
  externalId: string
  name: string
  type: "PROXMOX_HOST" | "VIRTUAL_MACHINE" | "CONTAINER" | "STORAGE"
  status: "ONLINE" | "OFFLINE" | "WARNING" | "UNKNOWN"
  hostname?: string | null
  description?: string | null
  platform: string
  platformVersion?: string | null
  vmId?: number | null
  nodeName?: string | null
  cpuAllocated?: number | null
  cpuUsagePercent?: number | null
  memoryAllocatedBytes?: number | null
  memoryUsedBytes?: number | null
  storageAllocatedBytes?: number | null
  storageUsedBytes?: number | null
  metadata?: Record<string, any>
}

export interface ProxmoxRelationship {
  sourceExternalId: string
  targetExternalId: string
  type: "HOSTED_ON" | "ATTACHED_TO"
}

export interface ProxmoxWarning {
  message: string
  context: string
  severity?: "LOW" | "MEDIUM" | "HIGH"
}

export interface NormalizedSystem {
  externalId: string
  externalType: "PROXMOX_NODE" | "PROXMOX_VM" | "PROXMOX_CONTAINER" | "PROXMOX_STORAGE"
  name: string
  type: SystemType
  status: SystemStatus
  hostname?: string | null
  description?: string | null
  platformVersion?: string | null
  vmContainerId?: string | null
  cpuAllocation?: number | null
  memoryAllocation?: number | null
  storageAllocation?: number | null
  parentExternalId?: string | null
  metadata: Record<string, any>
}

export interface MatchResult {
  externalId: string
  name: string
  matchType: "existing_mapping" | "new" | "changed" | "unchanged" | "missing" | "conflict"
  existingSystemId?: string | null
  existingSystem?: {
    id: string
    name: string
    type: SystemType
    status: SystemStatus
  } | null
  proposedChanges?: Record<string, { old: any; new: any }>
  conflictCandidates?: Array<{
    id: string
    name: string
    type: SystemType
    reason: string
  }>
  warnings?: string[]
}

export interface ImportPreview {
  importSourceId: string
  importSourceName: string
  schemaVersion: string
  generatedAt: Date
  totalResources: number
  summary: {
    new: number
    changed: number
    unchanged: number
    missing: number
    conflicts: number
  }
  matches: MatchResult[]
  collectorWarnings: ProxmoxWarning[]
  canImport: boolean
  errors?: string[]
}

export interface ImportExecutionResult {
  importRunId: string
  status: "COMPLETED" | "COMPLETED_WITH_WARNINGS" | "FAILED"
  totalResources: number
  newCount: number
  updatedCount: number
  unchangedCount: number
  missingCount: number
  conflictCount: number
  warningCount: number
  errors?: string[]
  createdSystems: Array<{ id: string; name: string }>
  updatedSystems: Array<{ id: string; name: string }>
}

export interface ConflictResolution {
  externalId: string
  action: "match_existing" | "create_new" | "skip"
  systemId?: string
}
