import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

async function getLocations() {
  return prisma.location.findMany({
    where: { archivedAt: null },
    include: {
      _count: {
        select: { systems: { where: { archivedAt: null } } },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export default async function LocationsPage() {
  const locations = await getLocations()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Locations</h1>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">No locations configured</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="rounded-lg border border-slate-800 bg-slate-900 p-6"
            >
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-white">{location.name}</h3>
                <Badge variant="secondary">{location.type.replace(/_/g, ' ')}</Badge>
              </div>
              
              {location.description && (
                <p className="mb-3 text-sm text-slate-400 line-clamp-2">
                  {location.description}
                </p>
              )}

              <div className="mb-3 text-sm text-slate-500">
                {location.city && <div>{location.city}</div>}
                {location.provider && <div>Provider: {location.provider}</div>}
              </div>

              <div className="flex items-center justify-between border-t border-slate-700 pt-3">
                <span className="text-sm text-slate-400">
                  {location._count.systems} systems
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
