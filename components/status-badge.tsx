import { Badge } from "@/components/ui/badge"
import { SystemStatus, Criticality } from "@prisma/client"

export function StatusBadge({ status }: { status: SystemStatus }) {
  const variants: Record<SystemStatus, { variant: "success" | "danger" | "warning" | "secondary", label: string }> = {
    ONLINE: { variant: "success", label: "Online" },
    OFFLINE: { variant: "danger", label: "Offline" },
    WARNING: { variant: "warning", label: "Warning" },
    MAINTENANCE: { variant: "secondary", label: "Maintenance" },
    UNKNOWN: { variant: "secondary", label: "Unknown" },
    RETIRED: { variant: "secondary", label: "Retired" },
  }

  const { variant, label } = variants[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  const variants: Record<Criticality, { variant: "danger" | "warning" | "default" | "secondary", label: string }> = {
    CRITICAL: { variant: "danger", label: "Critical" },
    HIGH: { variant: "warning", label: "High" },
    MEDIUM: { variant: "default", label: "Medium" },
    LOW: { variant: "secondary", label: "Low" },
  }

  const { variant, label } = variants[criticality]
  return <Badge variant={variant}>{label}</Badge>
}
