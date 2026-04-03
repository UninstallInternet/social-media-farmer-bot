"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  started: "bg-blue-100 text-blue-700",
};

export default function LogsPage() {
  const { t } = useI18n();
  const logs = trpc.logs.list.useQuery({ limit: 100, offset: 0 });
  const utils = trpc.useUtils();
  const clearLogs = trpc.logs.clear.useMutation({
    onSuccess: () => utils.logs.list.invalidate(),
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Job Logs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Publishing history and error details
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => utils.logs.list.invalidate()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                if (confirm("Clear all logs?")) clearLogs.mutate();
              }}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {logs.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : logs.data?.logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No logs yet. Logs appear when the worker processes scheduled posts.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Account</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.data?.logs.map((log) => (
                  <tr key={log.id} className={log.status === "failed" ? "bg-red-50/50" : ""}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {log.accountUsername ? `@${log.accountUsername}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <p className="truncate" title={log.message ?? ""}>
                        {log.message ?? "—"}
                      </p>
                      {log.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-gray-400 cursor-pointer">Stack trace</summary>
                          <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto bg-red-50 p-2 rounded">
                            {log.details}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
