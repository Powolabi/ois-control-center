import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, CriticalityBadge } from "@/components/status-badge"
import { formatDateTime } from "@/lib/utils"

async function getSystem(id: string) {
  const system = await prisma.system.findUnique({
    where: { id },
    include: {
      location: true,
      parentSystem: true,
      childSystems: {
        where: { archivedAt: null },
        include: { location: true },
      },
      dependenciesFrom: {
        include: { targetSystem: { include: { location: true } } },
      },
      dependenciesTo: {
        include: { sourceSystem: { include: { location: true } } },
      },
      endpoints: true,
      auditEvents: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      },
    },
  })

  if (!system) {
    return null
  }

  return system
}

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const system = await getSystem(id)

  if (!system) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{system.name}</h1>
          <p className="mt-1 text-slate-400">{system.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/systems/${system.id}/edit`}>
            <Button>Edit</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <StatusBadge status={system.status} />
        <CriticalityBadge criticality={system.criticality} />
        <Badge variant="secondary">{system.environment}</Badge>
        <Badge variant="default">{system.type.replace(/_/g, ' ')}</Badge>
      </div>

      {system.description && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-400">Description</h2>
          <p className="text-slate-200">{system.description}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-400">Location</dt>
              <dd className="text-slate-200">
                <Link
                  href={`/dashboard/locations/${system.location.id}`}
                  className="hover:text-ops-blue-400"
                >
                  {system.location.name}
                </Link>
              </dd>
            </div>
            {system.hostname && (
              <div>
                <dt className="text-sm text-slate-400">Hostname</dt>
                <dd className="text-slate-200">{system.hostname}</dd>
              </div>
            )}
            {system.privateIp && (
              <div>
                <dt className="text-sm text-slate-400">Private IP</dt>
                <dd className="text-slate-200">{system.privateIp}</dd>
              </div>
            )}
            {system.publicIp && (
              <div>
                <dt className="text-sm text-slate-400">Public IP</dt>
                <dd className="text-slate-200">{system.publicIp}</dd>
              </div>
            )}
            {system.operatingSystem && (
              <div>
                <dt className="text-sm text-slate-400">Operating System</dt>
                <dd className="text-slate-200">{system.operatingSystem}</dd>
              </div>
            )}
            {system.owner && (
              <div>
                <dt className="text-sm text-slate-400">Owner</dt>
                <dd className="text-slate-200">{system.owner}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Resources</h2>
          <dl className="space-y-3">
            {system.cpuAllocation && (
              <div>
                <dt className="text-sm text-slate-400">CPU</dt>
                <dd className="text-slate-200">{system.cpuAllocation} cores</dd>
              </div>
            )}
            {system.memoryAllocation && (
              <div>
                <dt className="text-sm text-slate-400">Memory</dt>
                <dd className="text-slate-200">{system.memoryAllocation} GB</dd>
              </div>
            )}
            {system.storageAllocation && (
              <div>
                <dt className="text-sm text-slate-400">Storage</dt>
                <dd className="text-slate-200">{system.storageAllocation} GB</dd>
              </div>
            )}
            {system.accessMethod && (
              <div>
                <dt className="text-sm text-slate-400">Access Method</dt>
                <dd className="text-slate-200">{system.accessMethod}</dd>
              </div>
            )}
            {system.credentialReference && (
              <div>
                <dt className="text-sm text-slate-400">Credentials</dt>
                <dd className="text-slate-200">{system.credentialReference}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {system.parentSystem && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Parent System</h2>
          <Link
            href={`/dashboard/systems/${system.parentSystem.id}`}
            className="block rounded-md border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
          >
            <div className="font-medium text-white">{system.parentSystem.name}</div>
            <div className="text-sm text-slate-400">
              {system.parentSystem.type.replace(/_/g, ' ')}
            </div>
          </Link>
        </div>
      )}

      {system.childSystems.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Child Systems ({system.childSystems.length})
          </h2>
          <div className="space-y-2">
            {system.childSystems.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/systems/${child.id}`}
                className="block rounded-md border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{child.name}</div>
                    <div className="text-sm text-slate-400">
                      {child.type.replace(/_/g, ' ')} • {child.location.name}
                    </div>
                  </div>
                  <StatusBadge status={child.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(system.dependenciesFrom.length > 0 || system.dependenciesTo.length > 0) && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Dependencies</h2>
          
          {system.dependenciesFrom.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-slate-400">Depends On</h3>
              <div className="space-y-2">
                {system.dependenciesFrom.map((dep) => (
                  <Link
                    key={dep.id}
                    href={`/dashboard/systems/${dep.targetSystem.id}`}
                    className="block rounded-md border border-slate-700 bg-slate-800 p-3 hover:bg-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {dep.targetSystem.name}
                        </div>
                        {dep.description && (
                          <div className="text-xs text-slate-400">{dep.description}</div>
                        )}
                      </div>
                      <Badge variant="secondary">{dep.type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {system.dependenciesTo.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-400">Required By</h3>
              <div className="space-y-2">
                {system.dependenciesTo.map((dep) => (
                  <Link
                    key={dep.id}
                    href={`/dashboard/systems/${dep.sourceSystem.id}`}
                    className="block rounded-md border border-slate-700 bg-slate-800 p-3 hover:bg-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">
                          {dep.sourceSystem.name}
                        </div>
                        {dep.description && (
                          <div className="text-xs text-slate-400">{dep.description}</div>
                        )}
                      </div>
                      <Badge variant="secondary">{dep.type.replace(/_/g, ' ')}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {system.endpoints.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Endpoints ({system.endpoints.length})
          </h2>
          <div className="space-y-3">
            {system.endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="rounded-md border border-slate-700 bg-slate-800 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-white">{endpoint.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{endpoint.address}</div>
                    {endpoint.notes && (
                      <div className="mt-1 text-xs text-slate-400">{endpoint.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{endpoint.type}</Badge>
                    {endpoint.isPublic && <Badge variant="warning">Public</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {system.tags.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {system.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {system.notes && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Notes</h2>
          <p className="whitespace-pre-wrap text-slate-200">{system.notes}</p>
        </div>
      )}

      {system.auditEvents.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Activity</h2>
          <div className="space-y-3">
            {system.auditEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className="text-slate-500">{formatDateTime(event.createdAt)}</div>
                <div className="flex-1 text-slate-300">
                  {event.action.replace(/_/g, ' ').toLowerCase()}
                </div>
                {event.user && (
                  <div className="text-slate-400">{event.user.email}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
