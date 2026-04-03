"use client";

import { Suspense, useState } from "react";
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

  const addManual = trpc.accounts.addManual.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate();
      setShowAddForm(false);
      setManualUsername("");
      setManualToken("");
      setManualIgUserId("");
      setManualPageId("");
    },
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "oauth">("manual");
  const [manualUsername, setManualUsername] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [manualIgUserId, setManualIgUserId] = useState("");
  const [manualPageId, setManualPageId] = useState("");

  const error = searchParams.get("error");
  const added = searchParams.get("added");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("accounts.title")}</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {t("accounts.addAccount")}
          </button>
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

        {/* Add Account Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{t("accounts.connectInstagram")}</h2>

            {/* Method tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAddMethod("manual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  addMethod === "manual"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
              >
                Manual (Token)
              </button>
              <button
                onClick={() => setAddMethod("oauth")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  addMethod === "oauth"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200"
                }`}
              >
                Facebook OAuth
              </button>
            </div>

            {addMethod === "manual" ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Enter your Instagram Business/Creator account details. You can get an access token from the
                  <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-blue-600 ml-1">
                    Meta Graph API Explorer
                  </a>.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram Username
                  </label>
                  <input
                    type="text"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder="e.g. myaccount"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Without the @ symbol</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram User ID
                  </label>
                  <input
                    type="text"
                    value={manualIgUserId}
                    onChange={(e) => setManualIgUserId(e.target.value)}
                    placeholder="e.g. 17841400123456789"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Numeric ID from Graph API (not the username)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    value={manualPageId}
                    onChange={(e) => setManualPageId(e.target.value)}
                    placeholder="e.g. 123456789012345"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">The Facebook Page linked to this Instagram account</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <textarea
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste your long-lived access token here"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Long-lived token with instagram_basic and instagram_content_publish permissions
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      addManual.mutate({
                        username: manualUsername,
                        instagramUserId: manualIgUserId,
                        facebookPageId: manualPageId,
                        accessToken: manualToken,
                      })
                    }
                    disabled={!manualUsername || !manualToken || !manualIgUserId || !manualPageId || addManual.isPending}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addManual.isPending ? t("common.loading") : t("accounts.addAccount")}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    {t("common.cancel")}
                  </button>
                </div>

                {addManual.error && (
                  <p className="text-sm text-red-600 mt-2">{addManual.error.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  OAuth requires a configured Meta App with instagram_content_publish permission and completed App Review.
                  If you haven&apos;t set this up yet, use the Manual method above.
                </p>
                <a
                  href="/api/auth/facebook"
                  className="inline-block px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Connect via Facebook
                </a>
              </div>
            )}
          </div>
        )}

        {/* Accounts List */}
        {accounts.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : accounts.data?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">{t("accounts.noAccounts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.data?.map((account) => (
              <div key={account.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {account.profilePicUrl ? (
                      <img src={account.profilePicUrl} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-lg font-bold">
                        {account.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">@{account.username}</p>
                      {account.displayName && (
                        <p className="text-sm text-gray-500">{account.displayName}</p>
                      )}
                    </div>
                  </div>
                  <TokenBadge status={account.tokenStatus} t={t} />
                </div>

                <div className="mt-4 flex gap-4 text-sm text-gray-500">
                  <span>{t("accounts.postsToday")}: {account.postsToday}</span>
                  <span>{t("accounts.scheduledCount")}: {account.scheduledCount}</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <button
                    onClick={() => toggleActive.mutate({ id: account.id, isActive: !account.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      account.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {account.isActive ? t("accounts.active") : t("accounts.inactive")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("accounts.removeConfirm"))) {
                        removeAccount.mutate({ id: account.id });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50"
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

function TokenBadge({ status, t }: { status: "valid" | "expiring" | "expired"; t: (key: string) => string }) {
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
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {t(labelKeys[status])}
    </span>
  );
}
