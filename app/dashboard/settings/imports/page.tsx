import { auth } from "@/lib/auth"
import Link from "next/link"
import { getImportHistory } from "@/lib/imports/import-service"

export const dynamic = 'force-dynamic'

export default async function ImportsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  const history = await getImportHistory(session.user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Import History</h1>
        <Link
          href="/dashboard/settings/imports/proxmox/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Import
        </Link>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-12 text-center">
          <p className="text-slate-400">No imports yet</p>
          <Link
            href="/dashboard/settings/imports/proxmox/new"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            Start your first import →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((run) => (
            <Link
              key={run.id}
              href={`/dashboard/settings/imports/${run.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-900 p-6 hover:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {run.importSource.name}
                    </h3>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        run.status === "COMPLETED"
                          ? "bg-green-500/10 text-green-400"
                          : run.status === "COMPLETED_WITH_WARNINGS"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : run.status === "FAILED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(run.startedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex gap-6 text-sm">
                    <div>
                      <span className="text-slate-400">Total:</span>{" "}
                      <span className="text-white">{run.totalResources}</span>
                    </div>
                    {run.newCount > 0 && (
                      <div>
                        <span className="text-slate-400">New:</span>{" "}
                        <span className="text-green-400">{run.newCount}</span>
                      </div>
                    )}
                    {run.updatedCount > 0 && (
                      <div>
                        <span className="text-slate-400">Updated:</span>{" "}
                        <span className="text-blue-400">{run.updatedCount}</span>
                      </div>
                    )}
                    {run.unchangedCount > 0 && (
                      <div>
                        <span className="text-slate-400">Unchanged:</span>{" "}
                        <span className="text-slate-400">{run.unchangedCount}</span>
                      </div>
                    )}
                    {run.conflictCount > 0 && (
                      <div>
                        <span className="text-slate-400">Conflicts:</span>{" "}
                        <span className="text-yellow-400">{run.conflictCount}</span>
                      </div>
                    )}
                    {run.missingCount > 0 && (
                      <div>
                        <span className="text-slate-400">Missing:</span>{" "}
                        <span className="text-orange-400">{run.missingCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">Schema v{run.schemaVersion}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
