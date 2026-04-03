"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export default function GroupsPage() {
  const { t } = useI18n();
  const groups = trpc.groups.list.useQuery();
  const accounts = trpc.accounts.list.useQuery();
  const utils = trpc.useUtils();

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => {
      utils.groups.list.invalidate();
      setShowForm(false);
      resetForm();
    },
  });

  const updateGroup = trpc.groups.update.useMutation({
    onSuccess: () => {
      utils.groups.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteGroup = trpc.groups.delete.useMutation({
    onSuccess: () => utils.groups.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());

  const resetForm = () => {
    setName("");
    setColor(PRESET_COLORS[0]);
    setSelectedAccountIds(new Set());
  };

  const startEdit = (group: NonNullable<typeof groups.data>[number]) => {
    setEditingId(group.id);
    setName(group.name);
    setColor(group.color);
    setSelectedAccountIds(new Set(group.accounts.map((a) => a.id)));
    setShowForm(false);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const accountIds = Array.from(selectedAccountIds);

    if (editingId) {
      updateGroup.mutate({ id: editingId, name, color, accountIds });
    } else {
      createGroup.mutate({ name, color, accountIds });
    }
  };

  const isFormOpen = showForm || editingId !== null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t("groups.title")}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Organize accounts into groups to post to multiple accounts at once
            </p>
          </div>
          {!isFormOpen && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {t("groups.createGroup")}
            </button>
          )}
        </div>

        {/* Create / Edit Form */}
        {isFormOpen && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? `Edit: ${name}` : t("groups.createGroup")}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("groups.name")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fashion Accounts, Fitness Niche"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("groups.color")}
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("groups.selectAccounts")}
                </label>
                {accounts.isLoading ? (
                  <p className="text-gray-400 text-sm">{t("common.loading")}</p>
                ) : accounts.data?.length === 0 ? (
                  <p className="text-gray-400 text-sm">{t("accounts.noAccounts")}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {accounts.data?.map((acc) => {
                      const selected = selectedAccountIds.has(acc.id);
                      return (
                        <button
                          key={acc.id}
                          onClick={() => toggleAccount(acc.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            selected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {acc.profilePicUrl ? (
                            <img src={acc.profilePicUrl} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                              👤
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">@{acc.username}</p>
                            {acc.displayName && (
                              <p className="text-xs text-gray-500">{acc.displayName}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  {selectedAccountIds.size} selected
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || createGroup.isPending || updateGroup.isPending}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Groups List */}
        {groups.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : groups.data?.length === 0 && !isFormOpen ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 mb-3">{t("groups.noGroups")}</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {t("groups.createGroup")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.data?.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-sm text-gray-500">
                        {group.memberCount} {t("groups.members").toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(group)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t("common.confirm") + "?")) {
                          deleteGroup.mutate({ id: group.id });
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>

                {/* Member avatars */}
                {group.accounts.length > 0 && (
                  <div className="mt-3 flex items-center gap-1">
                    {group.accounts.map((acc) => (
                      <div key={acc.id} className="relative group/avatar">
                        {acc.profilePicUrl ? (
                          <img
                            src={acc.profilePicUrl}
                            alt={`@${acc.username}`}
                            className="w-8 h-8 rounded-full border-2 border-white"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                            {acc.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/avatar:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                          @{acc.username}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
