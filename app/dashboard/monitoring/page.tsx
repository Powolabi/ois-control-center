import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HealthStatus } from "@prisma/client"

export const dynamic = 'force-dynamic'

async function getMonitoringStats() {
  const [
    totalMonitors,
    monitorsByHealth,
    openIncidents,
    recentFailures,
  ] = await Promise.all([
    prisma.monitor.count({ where: { archivedAt: null, enabled: true } }),
    prisma.monitor.groupBy({
      by: ['currentHealth'],
      where: { archivedAt: null, enabled: true },
      _count: true,
    }),
    prisma.incident.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    }),
    prisma.checkResult.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { monitor: { include: { system: true } } },
    }),
  ])

  return { totalMonitors, monitorsByHealth, openIncidents, recentFailures }
}

function HealthBadge({ health }: { health: HealthStatus }) {
  const colors: Record<HealthStatus, string> = {
    HEALTHY: 'bg-green-600',
    DEGRADED: 'bg-yellow-600',
    DOWN: 'bg-red-600',
    PAUSED: 'bg-gray-600',
    UNKNOWN: 'bg-slate-600',
  }
  return <Badge className={colors[health]}>{health}</Badge>
}

export default async function MonitoringPage() {
  const stats = await getMonitoringStats()

  const healthCounts = {
    HEALTHY: 0,
    DEGRADED: 0,
    DOWN: 0,
    PAUSED: 0,
    UNKNOWN: 0,
  }

  stats.monitorsByHealth.forEach(({ currentHealth, _count }) => {
    healthCounts[currentHealth] = _count
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Monitoring</h1>
        <Link href="/dashboard/monitoring/new">
          <Button>Create Monitor</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Total Monitors</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats.totalMonitors}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Healthy</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">{healthCounts.HEALTHY}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Degraded</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-400">{healthCounts.DEGRADED}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Down</h3>
          <p className="mt-2 text-3xl font-bold text-red-400">{healthCounts.DOWN}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Open Incidents</h3>
          <p className="mt-2 text-3xl font-bold text-red-400">{stats.openIncidents}</p>
        </div>
      </div>

      {stats.recentFailures.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Failures</h2>
          <div className="space-y-3">
            {stats.recentFailures.map((result) => (
              <Link
                key={result.id}
                href={`/dashboard/monitoring/${result.monitorId}`}
                className="block rounded-md border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{result.monitor.name}</h3>
                    <p className="text-sm text-slate-400">
                      {result.monitor.system.name}
                    </p>
                    {result.errorSummary && (
                      <p className="mt-1 text-sm text-red-400">{result.errorSummary}</p>
                    )}
                  </div>
                  <HealthBadge health={result.healthResult} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
