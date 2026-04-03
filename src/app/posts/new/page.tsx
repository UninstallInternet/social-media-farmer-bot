"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";

interface UploadedMedia {
  url: string;
  mediaType: "image" | "video";
  key: string;
}

export default function NewPostPage() {
  const { t } = useI18n();
  const router = useRouter();
  const accounts = trpc.accounts.list.useQuery();
  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });
  const uploadFromGDrive = trpc.media.uploadFromGoogleDrive.useMutation();

  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "carousel" | "reel">("image");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [gdriveUrl, setGdriveUrl] = useState("");

  const handleFileUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setUploadedMedia((prev) => [
        ...prev,
        ...data.uploads.map((u: { url: string; mediaType: string; key: string }) => ({
          url: u.url,
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
        { url: result.url, mediaType: result.mediaType as "image" | "video", key: result.key },
      ]);
      setGdriveUrl("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Google Drive fetch failed");
    }
  }, [gdriveUrl, uploadFromGDrive]);

  const handleSubmit = () => {
    if (!accountId) return alert(t("posts.selectAccount"));
    if (uploadedMedia.length === 0) return alert("Please add at least one media file");

    let scheduledAt: string | undefined;
    if (scheduleDate && scheduleTime) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    createPost.mutate({
      accountId,
      caption,
      hashtags,
      mediaType,
      scheduledAt,
      media: uploadedMedia.map((m, i) => ({
        mediaUrl: m.url,
        mediaType: m.mediaType,
        sortOrder: i,
      })),
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">{t("posts.createPost")}</h1>

        <div className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
          {/* Account Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("posts.account")}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("posts.selectAccount")}</option>
              {accounts.data?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.username}
                </option>
              ))}
            </select>
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("posts.mediaType")}
            </label>
            <div className="flex gap-2">
              {(["image", "carousel", "reel"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMediaType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mediaType === type
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
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

            {/* Drag & drop area */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";
                input.onchange = () => {
                  if (input.files) handleFileUpload(input.files);
                };
                input.click();
              }}
            >
              <p className="text-gray-500">{t("media.dragDrop")}</p>
              <p className="text-sm text-gray-400 mt-1">{t("media.orBrowse")}</p>
              <p className="text-xs text-gray-400 mt-2">{t("media.supportedFormats")}</p>
            </div>

            {uploading && (
              <p className="text-sm text-blue-600 mt-2">{t("common.loading")}</p>
            )}

            {/* Google Drive import */}
            <div className="mt-4 flex gap-2">
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
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {t("media.googleDrive")}
              </button>
            </div>

            {/* Preview uploaded media */}
            {uploadedMedia.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {uploadedMedia.map((media, i) => (
                  <div key={i} className="relative group">
                    {media.mediaType === "image" ? (
                      <img
                        src={media.url}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                        🎥
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setUploadedMedia((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
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
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("posts.captionPlaceholder")}
              rows={4}
              maxLength={2200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {caption.length}/2200
            </p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("posts.hashtags")}
            </label>
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
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={createPost.isPending}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {scheduleDate && scheduleTime
                ? t("posts.scheduled")
                : t("posts.draft")}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
