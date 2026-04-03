"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import { useSearchParams } from "next/navigation";

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsContent />
    </Suspense>
  );
}

function AccountsContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const accounts = trpc.accounts.list.useQuery();
  const utils = trpc.useUtils();

  const toggleActive = trpc.accounts.toggleActive.useMutation({
    onSuccess: () => utils.accounts.list.invalidate(),
  });

  const removeAccount = trpc.accounts.remove.useMutation({
    onSuccess: () => utils.accounts.list.invalidate(),
  });

  const error = searchParams.get("error");
  const added = searchParams.get("added");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
          <a
            href="/api/auth/facebook"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t("accounts.addAccount")}
          </a>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {t("common.error")}: {error}
          </div>
        )}

        {added && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {t("common.success")}: {added} account(s) connected
          </div>
        )}

        {accounts.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : accounts.data?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">{t("accounts.noAccounts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {accounts.data?.map((account) => (
              <div
                key={account.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {account.profilePicUrl ? (
                      <img
                        src={account.profilePicUrl}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                        👤
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">@{account.username}</p>
                      {account.displayName && (
                        <p className="text-sm text-gray-500">
                          {account.displayName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TokenBadge status={account.tokenStatus} t={t} />
                  </div>
                </div>

                <div className="mt-4 flex gap-4 text-sm text-gray-500">
                  <span>
                    {t("accounts.postsToday")}: {account.postsToday}
                  </span>
                  <span>
                    {t("accounts.scheduledCount")}: {account.scheduledCount}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <button
                    onClick={() =>
                      toggleActive.mutate({
                        id: account.id,
                        isActive: !account.isActive,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      account.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {account.isActive
                      ? t("accounts.active")
                      : t("accounts.inactive")}
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(t("accounts.removeConfirm"))) {
                        removeAccount.mutate({ id: account.id });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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
