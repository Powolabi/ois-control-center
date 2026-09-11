import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { StatusBadge, CriticalityBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { SystemType, SystemStatus, Criticality, Environment } from "@prisma/client"

interface SearchParams {
  search?: string
  type?: SystemType
  status?: SystemStatus
  criticality?: Criticality
  environment?: Environment
  location?: string
  archived?: string
}

async function getSystems(searchParams: SearchParams) {
  const where: any = {}

  if (searchParams.archived !== 'true') {
    where.archivedAt = null
  }

  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { hostname: { contains: searchParams.search, mode: 'insensitive' } },
      { privateIp: { contains: searchParams.search, mode: 'insensitive' } },
      { publicIp: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  if (searchParams.type) {
    where.type = searchParams.type
  }

  if (searchParams.status) {
    where.status = searchParams.status
  }

  if (searchParams.criticality) {
    where.criticality = searchParams.criticality
  }

  if (searchParams.environment) {
    where.environment = searchParams.environment
  }

  if (searchParams.location) {
    where.locationId = searchParams.location
  }

  const systems = await prisma.system.findMany({
    where,
    include: {
      location: true,
      _count: {
        select: {
          childSystems: true,
          dependenciesFrom: true,
          endpoints: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const locations = await prisma.location.findMany({
    where: { archivedAt: null },
    orderBy: { name: 'asc' },
  })

  return { systems, locations }
}

export default async function SystemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { systems, locations } = await getSystems(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Systems</h1>
        <Link href="/dashboard/systems/new">
          <Button>Register System</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <form method="GET" className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <input
            type="text"
            name="search"
            placeholder="Search systems..."
            defaultValue={params.search}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          
          <select
            name="type"
            defaultValue={params.type || ''}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">All Types</option>
            {Object.values(SystemType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={params.status || ''}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">All Statuses</option>
            {Object.values(SystemStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            name="criticality"
            defaultValue={params.criticality || ''}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">All Criticality</option>
            {Object.values(Criticality).map((crit) => (
              <option key={crit} value={crit}>
                {crit}
              </option>
            ))}
          </select>

          <select
            name="location"
            defaultValue={params.location || ''}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Button type="submit" size="sm">Filter</Button>
            <Link href="/dashboard/systems">
              <Button type="button" variant="secondary" size="sm">Clear</Button>
            </Link>
          </div>
        </form>
      </div>

      {systems.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">No systems found</p>
          <Link href="/dashboard/systems/new">
            <Button className="mt-4">Register First System</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {systems.map((system) => (
            <Link
              key={system.id}
              href={`/dashboard/systems/${system.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-900 p-6 transition-colors hover:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-white">{system.name}</h3>
                    <StatusBadge status={system.status} />
                    <CriticalityBadge criticality={system.criticality} />
                    <Badge variant="secondary">{system.environment}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {system.type.replace(/_/g, ' ')} • {system.location.name}
                  </p>
                  {system.description && (
                    <p className="mt-2 text-sm text-slate-300 line-clamp-2">
                      {system.description}
                    </p>
                  )}
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    {system.hostname && <span>Host: {system.hostname}</span>}
                    {system.privateIp && <span>IP: {system.privateIp}</span>}
                    {system._count.childSystems > 0 && (
                      <span>{system._count.childSystems} child systems</span>
                    )}
                    {system._count.dependenciesFrom > 0 && (
                      <span>{system._count.dependenciesFrom} dependencies</span>
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
