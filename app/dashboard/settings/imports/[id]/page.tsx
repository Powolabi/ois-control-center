import { auth } from "@/lib/auth"
import { getImportRunDetails } from "@/lib/imports/import-service"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function ImportRunDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const { id } = await params
  const run = await getImportRunDetails(id, session.user.id)

  if (!run) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Import Run Not Found</h1>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <p className="text-slate-400">The import run you are looking for does not exist.</p>
          <Link
            href="/dashboard/settings/imports"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            ← Back to Import History
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings/imports"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to Import History
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-white">Import Run Details</h1>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {run.importSource.name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {new Date(run.startedAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${
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

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Schema Version</dt>
            <dd className="mt-1 text-lg font-medium text-white">
              {run.schemaVersion}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Total Resources</dt>
            <dd className="mt-1 text-lg font-medium text-white">
              {run.totalResources}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">New Systems</dt>
            <dd className="mt-1 text-lg font-medium text-green-400">
              {run.newCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Updated Systems</dt>
            <dd className="mt-1 text-lg font-medium text-blue-400">
              {run.updatedCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Unchanged Systems</dt>
            <dd className="mt-1 text-lg font-medium text-slate-400">
              {run.unchangedCount}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Missing Systems</dt>
            <dd className="mt-1 text-lg font-medium text-orange-400">
              {run.missingCount}
            </dd>
          </div>
          {run.conflictCount > 0 && (
            <div>
              <dt className="text-sm text-slate-400">Conflicts</dt>
              <dd className="mt-1 text-lg font-medium text-yellow-400">
                {run.conflictCount}
              </dd>
            </div>
          )}
          {run.warningCount > 0 && (
            <div>
              <dt className="text-sm text-slate-400">Warnings</dt>
              <dd className="mt-1 text-lg font-medium text-yellow-400">
                {run.warningCount}
              </dd>
            </div>
          )}
        </dl>

        {run.errorSummary && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <h3 className="text-sm font-semibold text-red-400">Error</h3>
            <p className="mt-1 text-sm text-slate-300">{run.errorSummary}</p>
          </div>
        )}

        <div className="mt-6 flex gap-4 text-sm">
          <div>
            <span className="text-slate-400">Started:</span>{" "}
            <span className="text-white">
              {new Date(run.startedAt).toLocaleString()}
            </span>
          </div>
          {run.completedAt && (
            <div>
              <span className="text-slate-400">Completed:</span>{" "}
              <span className="text-white">
                {new Date(run.completedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm">
          <span className="text-slate-400">Initiated by:</span>{" "}
          <span className="text-white">{run.user.name || run.user.email}</span>
        </div>
      </div>
    </div>
  )
}
