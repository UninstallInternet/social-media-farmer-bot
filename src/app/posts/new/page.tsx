"use client";

import { useState, useCallback, Suspense } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import { useRouter, useSearchParams } from "next/navigation";

interface UploadedMedia {
  url: string;
  s3Url: string;
  mediaType: "image" | "video";
  key: string;
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostContent />
    </Suspense>
  );
}

function NewPostContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillDate = searchParams.get("date") || "";

  const accounts = trpc.accounts.list.useQuery();
  const groups = trpc.groups.list.useQuery();
  const createPost = trpc.posts.create.useMutation();
  const uploadFromGDrive = trpc.media.uploadFromGoogleDrive.useMutation();

  const [postTo, setPostTo] = useState<"account" | "group">("account");
  const [accountId, setAccountId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "carousel" | "reel">("image");
  const [scheduleDate, setScheduleDate] = useState(prefillDate);
  const [scheduleTime, setScheduleTime] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [captionVariants, setCaptionVariants] = useState<string[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gdriveUrl, setGdriveUrl] = useState("");

  const handleFileUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setUploadedMedia((prev) => [
        ...prev,
        ...data.uploads.map((u: { url: string; s3Url: string; mediaType: string; key: string }) => ({
          url: u.url,
          s3Url: u.s3Url,
          mediaType: u.mediaType as "image" | "video",
          key: u.key,
        })),
      ]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleGoogleDriveUpload = useCallback(async () => {
    if (!gdriveUrl) return;
    try {
      const result = await uploadFromGDrive.mutateAsync({ driveUrl: gdriveUrl });
      setUploadedMedia((prev) => [
        ...prev,
        { url: result.url, s3Url: result.s3Url, mediaType: result.mediaType as "image" | "video", key: result.key },
      ]);
      setGdriveUrl("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Google Drive fetch failed");
    }
  }, [gdriveUrl, uploadFromGDrive]);

  const handleSubmit = async () => {
    if (postTo === "account" && !accountId) return alert(t("posts.selectAccount"));
    if (postTo === "group" && !groupId) return alert(t("groups.selectGroup"));
    if (uploadedMedia.length === 0) return alert("Please add at least one media file");

    let scheduledAt: string | undefined;
    if (scheduleDate && scheduleTime) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    const media = uploadedMedia.map((m, i) => ({
      mediaUrl: m.url,
      s3Url: m.s3Url,
      mediaType: m.mediaType,
      sortOrder: i,
    }));

    const variants = captionVariants.filter((v) => v.trim());

    if (postTo === "group" && groupId) {
      const group = groups.data?.find((g) => g.id === groupId);
      if (!group || group.accounts.length === 0) return alert("Group has no accounts");

      await Promise.all(
        group.accounts.map((acc) =>
          createPost.mutateAsync({
            accountId: acc.id,
            caption,
            hashtags,
            mediaType,
            scheduledAt,
            groupId,
            media,
            captionVariants: variants.length > 0 ? variants : undefined,
          })
        )
      );
      router.push("/calendar");
    } else {
      await createPost.mutateAsync({
        accountId,
        caption,
        hashtags,
        mediaType,
        scheduledAt,
        media,
        captionVariants: variants.length > 0 ? variants : undefined,
      });
      router.push("/calendar");
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">{t("posts.createPost")}</h1>

        <div className="grid grid-cols-5 gap-6">
          {/* Form — left side */}
          <div className="col-span-3 space-y-5 bg-white rounded-xl border border-gray-200 p-6">
            {/* Post to: Account or Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post to
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setPostTo("account")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    postTo === "account"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  👤 Single Account
                </button>
                <button
                  onClick={() => setPostTo("group")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    postTo === "group"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  📁 {t("groups.assignToGroup")}
                </button>
              </div>

              {postTo === "account" ? (
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">{t("posts.selectAccount")}</option>
                  {accounts.data?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      @{acc.username} {acc.displayName ? `(${acc.displayName})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
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

              {/* Show group members preview */}
              {postTo === "group" && groupId && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs text-gray-400 mr-1">Will post to:</span>
                  {groups.data
                    ?.find((g) => g.id === groupId)
                    ?.accounts.map((acc) => (
                      <span key={acc.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        @{acc.username}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Media Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("posts.mediaType")}
              </label>
              <div className="flex gap-2">
                {(["image", "carousel", "reel"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      mediaType === type
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {type === "image" ? "🖼 " : type === "carousel" ? "🎠 " : "🎬 "}
                    {t(`posts.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("media.upload")}
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";
                  input.onchange = () => { if (input.files) handleFileUpload(input.files); };
                  input.click();
                }}
              >
                <p className="text-gray-500">{t("media.dragDrop")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("media.supportedFormats")}</p>
              </div>

              {uploading && <p className="text-sm text-blue-600 mt-2">{t("common.loading")}</p>}

              {/* Google Drive */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  placeholder={t("media.googleDriveUrl")}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleGoogleDriveUpload}
                  disabled={!gdriveUrl || uploadFromGDrive.isPending}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  {t("media.googleDrive")}
                </button>
              </div>

              {/* Media preview */}
              {uploadedMedia.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {uploadedMedia.map((media, i) => (
                    <div key={i} className="relative group">
                      {media.mediaType === "image" ? (
                        <img src={media.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">🎥</div>
                      )}
                      <button
                        onClick={() => setUploadedMedia((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("posts.caption")}
              </label>
              <p className="text-xs text-gray-400 mb-1">
                Main caption text. Max 2200 characters. Hashtags go in the separate field below.
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t("posts.captionPlaceholder")}
                rows={4}
                maxLength={2200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{caption.length}/2200</p>

              {/* Caption Variants toggle */}
              <button
                type="button"
                onClick={() => setShowVariants(!showVariants)}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                {showVariants ? "- Hide caption variants" : "+ Add caption variants (randomize per account)"}
              </button>

              {showVariants && (
                <div className="mt-3 space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-purple-700">
                    Add multiple caption options. When posting to a group, each account will get a random caption from this list instead of the main caption above.
                  </p>
                  {captionVariants.map((v, i) => (
                    <div key={i} className="flex gap-2">
                      <textarea
                        value={v}
                        onChange={(e) => {
                          const next = [...captionVariants];
                          next[i] = e.target.value;
                          setCaptionVariants(next);
                        }}
                        rows={2}
                        maxLength={2200}
                        placeholder={`Caption variant ${i + 1}`}
                        className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm resize-none bg-white"
                      />
                      <button
                        onClick={() => setCaptionVariants((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600 text-sm px-2"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setCaptionVariants((prev) => [...prev, ""])}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    + Add another variant
                  </button>
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("posts.hashtags")}
              </label>
              <p className="text-xs text-gray-400 mb-1">
                Space-separated hashtags, e.g. #fashion #style. Max 30 hashtags. Appended after caption.
              </p>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder={t("posts.hashtagsPlaceholder")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("posts.scheduleDate")}
                </label>
                <p className="text-xs text-gray-400 mb-1">YYYY-MM-DD</p>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("posts.scheduleTime")}
                </label>
                <p className="text-xs text-gray-400 mb-1">24h format, e.g. 14:30</p>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={createPost.isPending}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {scheduleDate && scheduleTime ? `Schedule Post` : `Save as Draft`}
              </button>
              <button
                onClick={() => router.push("/calendar")}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>

          {/* Preview — right side */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Preview
              </h3>

              {/* Mock Instagram post */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 p-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200" />
                  <span className="text-sm font-semibold">
                    {postTo === "account"
                      ? accounts.data?.find((a) => a.id === accountId)?.username || "username"
                      : groups.data?.find((g) => g.id === groupId)?.name || "group"}
                  </span>
                </div>

                {/* Image placeholder */}
                {uploadedMedia.length > 0 && uploadedMedia[0].mediaType === "image" ? (
                  <img src={uploadedMedia[0].url} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-4xl text-gray-300">
                    {mediaType === "reel" ? "🎬" : mediaType === "carousel" ? "🎠" : "🖼"}
                  </div>
                )}

                {/* Caption */}
                <div className="p-3">
                  {caption ? (
                    <p className="text-sm">
                      <span className="font-semibold">
                        {postTo === "account"
                          ? accounts.data?.find((a) => a.id === accountId)?.username
                          : "account"}
                      </span>{" "}
                      {caption}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-300 italic">Caption preview...</p>
                  )}
                  {hashtags && (
                    <p className="text-sm text-blue-500 mt-1">{hashtags}</p>
                  )}
                </div>
              </div>

              {/* Schedule info */}
              {scheduleDate && scheduleTime && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  Scheduled for: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                </div>
              )}

              {postTo === "group" && groupId && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  Will create {groups.data?.find((g) => g.id === groupId)?.memberCount || 0} posts (one per account in group)
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
