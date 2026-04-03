"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  publishing: "bg-yellow-100 text-yellow-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function GalleryPage() {
  const { t } = useI18n();
  const router = useRouter();
  const accounts = trpc.accounts.list.useQuery();
  const groups = trpc.groups.list.useQuery();
  const gallery = trpc.posts.gallery.useQuery({ limit: 50, offset: 0 });
  const clonePost = trpc.posts.clone.useMutation({
    onSuccess: () => router.push("/calendar"),
  });

  const [cloneModal, setCloneModal] = useState<string | null>(null);
  const [cloneAccountId, setCloneAccountId] = useState("");
  const [cloneGroupId, setCloneGroupId] = useState("");
  const [cloneDate, setCloneDate] = useState("");
  const [cloneTime, setCloneTime] = useState("");
  const [cloneTo, setCloneTo] = useState<"account" | "group">("account");

  const handleClone = () => {
    if (!cloneModal) return;

    let scheduledAt: string | undefined;
    if (cloneDate && cloneTime) {
      scheduledAt = new Date(`${cloneDate}T${cloneTime}`).toISOString();
    }

    if (cloneTo === "group" && cloneGroupId) {
      const group = groups.data?.find((g) => g.id === cloneGroupId);
      if (!group) return;
      // Clone to each account in the group
      Promise.all(
        group.accounts.map((acc) =>
          clonePost.mutateAsync({
            sourcePostId: cloneModal,
            accountId: acc.id,
            scheduledAt,
            groupId: cloneGroupId,
          })
        )
      ).then(() => {
        setCloneModal(null);
        router.push("/calendar");
      });
    } else if (cloneAccountId) {
      clonePost.mutate({
        sourcePostId: cloneModal,
        accountId: cloneAccountId,
        scheduledAt,
      });
      setCloneModal(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Content Gallery</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse all posts. Click "Reuse" to clone content to a new account or date.
            </p>
          </div>
        </div>

        {gallery.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : gallery.data?.posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">{t("common.noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.data?.posts.map((post) => {
              const thumbnail = post.media[0];
              const hasVariants = (post.captionVariants?.length ?? 0) > 0;

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square relative bg-gray-100">
                    {thumbnail?.mediaType === "image" ? (
                      <img
                        src={thumbnail.mediaUrl}
                        alt={thumbnail.altText ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : thumbnail?.mediaType === "video" ? (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 bg-gray-100">
                        🎬
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                        🖼
                      </div>
                    )}

                    {/* Media type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                        {post.mediaType}
                      </span>
                    </div>

                    {/* Carousel count */}
                    {post.media.length > 1 && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                          {post.media.length} items
                        </span>
                      </div>
                    )}

                    {/* Hover overlay with reuse button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => {
                          setCloneModal(post.id);
                          setCloneAccountId("");
                          setCloneGroupId("");
                          setCloneDate("");
                          setCloneTime("");
                        }}
                        className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100"
                      >
                        Reuse Content
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        @{post.account?.username}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${STATUS_COLORS[post.status]}`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {post.caption || "(no caption)"}
                    </p>
                    {hasVariants && (
                      <p className="text-xs text-purple-600 mt-1">
                        {post.captionVariants!.length} caption variants
                      </p>
                    )}
                    {post.scheduledAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(post.scheduledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clone Modal */}
        {cloneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Reuse Content</h2>
              <p className="text-sm text-gray-500 mb-4">
                Clone this post to a new account or group with a new schedule.
              </p>

              {/* Target selector */}
              <div className="space-y-3">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setCloneTo("account")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      cloneTo === "account"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    Single Account
                  </button>
                  <button
                    onClick={() => setCloneTo("group")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                      cloneTo === "group"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    Group
                  </button>
                </div>

                {cloneTo === "account" ? (
                  <select
                    value={cloneAccountId}
                    onChange={(e) => setCloneAccountId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">{t("posts.selectAccount")}</option>
                    {accounts.data?.map((acc) => (
                      <option key={acc.id} value={acc.id}>@{acc.username}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={cloneGroupId}
                    onChange={(e) => setCloneGroupId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">{t("groups.selectGroup")}</option>
                    {groups.data?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberCount} accounts)
                      </option>
                    ))}
                  </select>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Date <span className="text-gray-400">(YYYY-MM-DD)</span>
                    </label>
                    <input
                      type="date"
                      value={cloneDate}
                      onChange={(e) => setCloneDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Time <span className="text-gray-400">(HH:MM)</span>
                    </label>
                    <input
                      type="time"
                      value={cloneTime}
                      onChange={(e) => setCloneTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleClone}
                  disabled={
                    clonePost.isPending ||
                    (cloneTo === "account" && !cloneAccountId) ||
                    (cloneTo === "group" && !cloneGroupId)
                  }
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Clone & Schedule
                </button>
                <button
                  onClick={() => setCloneModal(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
