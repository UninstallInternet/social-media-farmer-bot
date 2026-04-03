"use client";

import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    publishing: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100"}`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const stats = trpc.posts.stats.useQuery();
  const recentPosts = trpc.posts.list.useQuery({ limit: 10 });
  const accountsList = trpc.accounts.list.useQuery();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8">
        <h1 className="text-2xl font-bold mb-6">{t("dashboard.title")}</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={t("dashboard.scheduledToday")}
            value={stats.data?.scheduledToday ?? 0}
            color="blue"
          />
          <StatCard
            label={t("dashboard.publishedToday")}
            value={stats.data?.publishedToday ?? 0}
            color="green"
          />
          <StatCard
            label={t("dashboard.pending")}
            value={stats.data?.pending ?? 0}
            color="yellow"
          />
          <StatCard
            label={t("dashboard.failed")}
            value={stats.data?.failed ?? 0}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Posts */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {t("dashboard.recentPosts")}
            </h2>
            {recentPosts.isLoading ? (
              <p className="text-gray-500">{t("common.loading")}</p>
            ) : recentPosts.data?.posts.length === 0 ? (
              <p className="text-gray-500">{t("dashboard.noPostsToday")}</p>
            ) : (
              <div className="space-y-3">
                {recentPosts.data?.posts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {post.account?.profilePicUrl ? (
                        <img
                          src={post.account.profilePicUrl}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          @{post.account?.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {post.caption || "(no caption)"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleString()
                          : "Not scheduled"}
                      </span>
                      <StatusBadge status={post.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Health */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">
              {t("dashboard.accountHealth")}
            </h2>
            {accountsList.isLoading ? (
              <p className="text-gray-500">{t("common.loading")}</p>
            ) : accountsList.data?.length === 0 ? (
              <p className="text-gray-500">{t("accounts.noAccounts")}</p>
            ) : (
              <div className="space-y-3">
                {accountsList.data?.map((account) => (
                  <div
                    key={account.id}
                    className="p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        @{account.username}
                      </span>
                      <TokenBadge status={account.tokenStatus} t={t} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>
                        {t("accounts.postsToday")}: {account.postsToday}
                      </span>
                      <span>
                        {t("accounts.scheduledCount")}: {account.scheduledCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TokenBadge({
  status,
  t,
}: {
  status: "valid" | "expiring" | "expired";
  t: (key: string) => string;
}) {
  const styles = {
    valid: "bg-green-100 text-green-700",
    expiring: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
  };

  const labelKeys = {
    valid: "accounts.tokenValid",
    expiring: "accounts.tokenExpiring",
    expired: "accounts.tokenExpired",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {t(labelKeys[status])}
    </span>
  );
}
