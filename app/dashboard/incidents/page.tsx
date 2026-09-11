import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { IncidentStatus } from "@prisma/client"

export const dynamic = 'force-dynamic'

async function getIncidents() {
  return prisma.incident.findMany({
    include: {
      monitor: true,
      system: true,
    },
    orderBy: { openedAt: 'desc' },
    take: 100,
  })
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const colors: Record<IncidentStatus, string> = {
    OPEN: 'bg-red-600',
    ACKNOWLEDGED: 'bg-yellow-600',
    RESOLVED: 'bg-green-600',
  }
  return <Badge className={colors[status]}>{status}</Badge>
}

export default async function IncidentsPage() {
  const incidents = await getIncidents()

  const openIncidents = incidents.filter(i => i.status === 'OPEN')
  const acknowledgedIncidents = incidents.filter(i => i.status === 'ACKNOWLEDGED')
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Incidents</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Open</h3>
          <p className="mt-2 text-3xl font-bold text-red-400">{openIncidents.length}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Acknowledged</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-400">{acknowledgedIncidents.length}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Resolved</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">{resolvedIncidents.length}</p>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">No incidents</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/dashboard/monitoring/${incident.monitorId}`}
              className="block rounded-lg border border-slate-800 bg-slate-900 p-6 hover:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{incident.monitor.name}</h3>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    System: {incident.system.name}
                  </p>
                  <p className="mt-2 text-sm text-red-400">{incident.failureSummary}</p>
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span>Opened: {formatDateTime(incident.openedAt)}</span>
                    {incident.resolvedAt && (
                      <span>Resolved: {formatDateTime(incident.resolvedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
