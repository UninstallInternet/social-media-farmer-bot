"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";

interface ParsedRow {
  rowNumber: number;
  accountUsername: string;
  caption: string;
  hashtags: string;
  mediaFiles: string;
  mediaType: "image" | "carousel" | "reel";
  scheduleDate: string;
  scheduleTime: string;
  altText?: string;
  valid: boolean;
  errors: string[];
}

type Step = "upload" | "validate" | "preview" | "confirm";

export default function ImportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const accounts = trpc.accounts.list.useQuery();
  const createPost = trpc.posts.create.useMutation();

  const [step, setStep] = useState<Step>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());

      if (lines.length < 2) {
        alert("CSV must have a header row and at least one data row");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const accountMap = new Map(
        accounts.data?.map((a) => [a.username.toLowerCase(), a.id]) ?? []
      );

      const rows: ParsedRow[] = lines.slice(1).map((line, index) => {
        // Simple CSV parsing (handles basic cases)
        const values = parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i]?.trim() ?? "";
        });

        const errors: string[] = [];
        const username = row["account_username"] || row["account"] || "";
        if (!username) errors.push("Missing account_username");
        if (username && !accountMap.has(username.toLowerCase().replace("@", ""))) {
          errors.push(`Account @${username} not found`);
        }

        const mediaType = (row["media_type"] || "image") as "image" | "carousel" | "reel";
        if (!["image", "carousel", "reel"].includes(mediaType)) {
          errors.push(`Invalid media_type: ${mediaType}`);
        }

        const scheduleDate = row["schedule_date"] || "";
        const scheduleTime = row["schedule_time"] || "";
        if (!scheduleDate) errors.push("Missing schedule_date");
        if (!scheduleTime) errors.push("Missing schedule_time");

        return {
          rowNumber: index + 2,
          accountUsername: username.replace("@", ""),
          caption: row["caption"] || "",
          hashtags: row["hashtags"] || "",
          mediaFiles: row["media_files"] || "",
          mediaType,
          scheduleDate,
          scheduleTime,
          altText: row["alt_text"],
          valid: errors.length === 0,
          errors,
        };
      });

      setParsedRows(rows);
      setStep("validate");
    },
    [accounts.data]
  );

  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    const accountMap = new Map(
      accounts.data?.map((a) => [a.username.toLowerCase(), a.id]) ?? []
    );

    setImporting(true);
    setImportProgress(0);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const accountId = accountMap.get(row.accountUsername.toLowerCase());
      if (!accountId) continue;

      try {
        const scheduledAt = new Date(
          `${row.scheduleDate}T${row.scheduleTime}`
        ).toISOString();

        // For now, media URLs would need to be pre-uploaded
        // In a full implementation, we'd handle the media_files column
        await createPost.mutateAsync({
          accountId,
          caption: row.caption,
          hashtags: row.hashtags,
          mediaType: row.mediaType,
          scheduledAt,
          media: [], // Media would be attached in a real implementation
        });
      } catch (error) {
        // Continue importing other rows on individual failure
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    router.push("/dashboard");
  }, [parsedRows, accounts.data, createPost, router]);

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("import.title")}</h1>
          <a
            href="/templates/import-template.csv"
            download
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            {t("import.downloadTemplate")}
          </a>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["upload", "validate", "preview", "confirm"] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : parsedRows.length > 0 && i < ["upload", "validate", "preview", "confirm"].indexOf(step)
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && (
                  <div className="w-12 h-0.5 bg-gray-200 mx-1" />
                )}
              </div>
            )
          )}
        </div>

        {/* Upload Step */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv,.xlsx,.xls";
              input.onchange = () => {
                if (input.files?.[0]) handleFileUpload(input.files[0]);
              };
              input.click();
            }}
          >
            <p className="text-lg text-gray-600">{t("import.uploadCsv")}</p>
            <p className="text-sm text-gray-400 mt-2">CSV or Excel</p>
          </div>
        )}

        {/* Validate Step */}
        {step === "validate" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex gap-4 mb-4">
              <div className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                {t("import.validRows")}: {validCount}
              </div>
              <div className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm">
                {t("import.invalidRows")}: {invalidCount}
              </div>
            </div>

            {invalidCount > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-red-600 mb-2">
                  {t("import.validationErrors")}
                </h3>
                <div className="space-y-1">
                  {parsedRows
                    .filter((r) => !r.valid)
                    .map((r) => (
                      <div
                        key={r.rowNumber}
                        className="text-sm text-red-600 bg-red-50 p-2 rounded"
                      >
                        Row {r.rowNumber}: {r.errors.join(", ")}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">{t("posts.account")}</th>
                    <th className="px-3 py-2 text-left">{t("posts.caption")}</th>
                    <th className="px-3 py-2 text-left">{t("posts.mediaType")}</th>
                    <th className="px-3 py-2 text-left">{t("posts.scheduleDate")}</th>
                    <th className="px-3 py-2 text-left">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.valid ? "" : "bg-red-50"}
                    >
                      <td className="px-3 py-2">{row.rowNumber}</td>
                      <td className="px-3 py-2">@{row.accountUsername}</td>
                      <td className="px-3 py-2 truncate max-w-xs">
                        {row.caption}
                      </td>
                      <td className="px-3 py-2">{row.mediaType}</td>
                      <td className="px-3 py-2">
                        {row.scheduleDate} {row.scheduleTime}
                      </td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <span className="text-green-600">OK</span>
                        ) : (
                          <span className="text-red-600">Error</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {importing
                  ? `Importing... ${importProgress}%`
                  : `${t("import.confirmImport")} (${validCount} posts)`}
              </button>
              <button
                onClick={() => {
                  setParsedRows([]);
                  setStep("upload");
                }}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                {t("common.back")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
