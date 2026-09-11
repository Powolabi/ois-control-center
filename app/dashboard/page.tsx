import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge, CriticalityBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/utils"

async function getDashboardStats() {
  const [
    totalSystems,
    systemsByType,
    systemsByStatus,
    systemsByCriticality,
    recentSystems,
    criticalSystems,
  ] = await Promise.all([
    prisma.system.count({ where: { archivedAt: null } }),
    prisma.system.groupBy({
      by: ['type'],
      where: { archivedAt: null },
      _count: true,
    }),
    prisma.system.groupBy({
      by: ['status'],
      where: { archivedAt: null },
      _count: true,
    }),
    prisma.system.groupBy({
      by: ['criticality'],
      where: { archivedAt: null },
      _count: true,
    }),
    prisma.system.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { location: true },
    }),
    prisma.system.findMany({
      where: {
        archivedAt: null,
        OR: [
          { status: 'OFFLINE' },
          { status: 'WARNING' },
          { criticality: 'CRITICAL' },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { location: true },
    }),
  ])

  return {
    totalSystems,
    systemsByType,
    systemsByStatus,
    systemsByCriticality,
    recentSystems,
    criticalSystems,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <Link href="/dashboard/systems/new">
          <Button>Register System</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Total Systems</h3>
          <p className="mt-2 text-3xl font-bold text-white">{stats.totalSystems}</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Online</h3>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {stats.systemsByStatus.find(s => s.status === 'ONLINE')?._count || 0}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Warning/Offline</h3>
          <p className="mt-2 text-3xl font-bold text-red-400">
            {(stats.systemsByStatus.find(s => s.status === 'OFFLINE')?._count || 0) +
             (stats.systemsByStatus.find(s => s.status === 'WARNING')?._count || 0)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-sm font-medium text-slate-400">Critical Systems</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-400">
            {stats.systemsByCriticality.find(s => s.criticality === 'CRITICAL')?._count || 0}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Systems by Type</h2>
          <div className="space-y-2">
            {stats.systemsByType.length > 0 ? (
              stats.systemsByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{item.type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{item._count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No systems registered yet</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Systems by Status</h2>
          <div className="space-y-2">
            {stats.systemsByStatus.length > 0 ? (
              stats.systemsByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <StatusBadge status={item.status} />
                  <Badge variant="secondary">{item._count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No systems registered yet</p>
            )}
          </div>
        </div>
      </div>

      {stats.criticalSystems.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Systems Requiring Attention</h2>
          <div className="space-y-3">
            {stats.criticalSystems.map((system) => (
              <Link
                key={system.id}
                href={`/dashboard/systems/${system.id}`}
                className="block rounded-md border border-slate-700 bg-slate-800 p-4 transition-colors hover:bg-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{system.name}</h3>
                    <p className="text-sm text-slate-400">{system.location.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={system.status} />
                    <CriticalityBadge criticality={system.criticality} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recently Added Systems</h2>
          <Link href="/dashboard/systems">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {stats.recentSystems.length > 0 ? (
            stats.recentSystems.map((system) => (
              <Link
                key={system.id}
                href={`/dashboard/systems/${system.id}`}
                className="block rounded-md border border-slate-700 bg-slate-800 p-4 transition-colors hover:bg-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">{system.name}</h3>
                    <p className="text-sm text-slate-400">
                      {system.location.name} • Added {formatDateTime(system.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{system.type.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">No systems registered yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
