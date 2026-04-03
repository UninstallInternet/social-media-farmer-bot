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
  groupName?: string;
  valid: boolean;
  errors: string[];
}

const REQUIRED_COLUMNS = [
  { name: "account_username", description: "Instagram username (without @)", example: "myaccount" },
  { name: "media_type", description: "Type of post: image, carousel, or reel", example: "image" },
  { name: "schedule_date", description: "Date to publish (YYYY-MM-DD)", example: "2026-04-15" },
  { name: "schedule_time", description: "Time to publish (HH:MM, 24h format)", example: "09:00" },
];

const OPTIONAL_COLUMNS = [
  { name: "caption", description: "Post caption text (max 2200 chars)", example: "Check this out!" },
  { name: "hashtags", description: "Hashtags to append", example: "#trending #viral" },
  { name: "media_files", description: "Filenames (semicolon-separated for carousel)", example: "photo1.jpg" },
  { name: "alt_text", description: "Image alt text for accessibility", example: "Product photo" },
  { name: "group_name", description: "Group to assign the post to", example: "Fashion" },
];

export default function ImportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const accounts = trpc.accounts.list.useQuery();
  const createPost = trpc.posts.create.useMutation();

  const [step, setStep] = useState<"schema" | "upload" | "validate">("schema");
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
        if (scheduleDate && !/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) {
          errors.push("schedule_date must be YYYY-MM-DD");
        }
        if (scheduleTime && !/^\d{2}:\d{2}$/.test(scheduleTime)) {
          errors.push("schedule_time must be HH:MM");
        }

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
          groupName: row["group_name"],
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
        const scheduledAt = new Date(`${row.scheduleDate}T${row.scheduleTime}`).toISOString();
        await createPost.mutateAsync({
          accountId,
          caption: row.caption,
          hashtags: row.hashtags,
          mediaType: row.mediaType,
          scheduledAt,
          media: [],
        });
      } catch {
        // Continue on individual failure
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImporting(false);
    router.push("/calendar");
  }, [parsedRows, accounts.data, createPost, router]);

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("import.title")}</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { key: "schema", label: "1. Understand Format" },
            { key: "upload", label: "2. Upload File" },
            { key: "validate", label: "3. Review & Import" },
          ].map((s, i) => {
            const steps = ["schema", "upload", "validate"];
            const currentIdx = steps.indexOf(step);
            const isActive = step === s.key;
            const isDone = i < currentIdx;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : isDone
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-400"
                }`}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span className={`text-sm font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                  {s.label}
                </span>
                {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Schema explanation — example table first */}
        {step === "schema" && (
          <div className="space-y-6">
            {/* Example table — the first thing users see */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-2">Your CSV should look like this:</h2>
              <p className="text-sm text-gray-500 mb-4">Each row is one post. Here are 3 example rows.</p>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">account_username</th>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">caption</th>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">hashtags</th>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">media_type</th>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">schedule_date</th>
                      <th className="px-3 py-2 font-mono text-xs text-gray-600">schedule_time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-3 py-2">myaccount</td>
                      <td className="px-3 py-2">Check this out!</td>
                      <td className="px-3 py-2">#trending #new</td>
                      <td className="px-3 py-2">image</td>
                      <td className="px-3 py-2">2026-04-15</td>
                      <td className="px-3 py-2">09:00</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">myaccount</td>
                      <td className="px-3 py-2">Behind the scenes</td>
                      <td className="px-3 py-2">#bts</td>
                      <td className="px-3 py-2">carousel</td>
                      <td className="px-3 py-2">2026-04-15</td>
                      <td className="px-3 py-2">17:00</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2">otheraccount</td>
                      <td className="px-3 py-2">Tutorial time</td>
                      <td className="px-3 py-2">#howto</td>
                      <td className="px-3 py-2">reel</td>
                      <td className="px-3 py-2">2026-04-16</td>
                      <td className="px-3 py-2">12:00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setStep("upload")}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Got it — Upload File
                </button>
                <a
                  href="/templates/import-template.csv"
                  download
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  {t("import.downloadTemplate")}
                </a>
              </div>
            </div>

            {/* Column reference — below the example */}
            <details className="bg-white rounded-xl border border-gray-200">
              <summary className="p-4 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
                Column reference (click to expand)
              </summary>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Required</h3>
                  <div className="grid gap-1">
                    {REQUIRED_COLUMNS.map((col) => (
                      <div key={col.name} className="flex gap-3 text-sm">
                        <code className="font-mono text-red-700 min-w-[140px]">{col.name}</code>
                        <span className="text-gray-500">{col.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Optional</h3>
                  <div className="grid gap-1">
                    {OPTIONAL_COLUMNS.map((col) => (
                      <div key={col.name} className="flex gap-3 text-sm">
                        <code className="font-mono text-gray-600 min-w-[140px]">{col.name}</code>
                        <span className="text-gray-500">{col.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
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
              <div className="text-4xl mb-3">📄</div>
              <p className="text-lg text-gray-600">{t("import.uploadCsv")}</p>
              <p className="text-sm text-gray-400 mt-2">CSV or Excel (.csv, .xlsx, .xls)</p>
            </div>

            <button
              onClick={() => setStep("schema")}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; {t("common.back")}
            </button>
          </div>
        )}

        {/* Step 3: Validate & Import */}
        {step === "validate" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-700">{validCount}</p>
                <p className="text-sm text-green-600">{t("import.validRows")}</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                <p className="text-sm text-red-600">{t("import.invalidRows")}</p>
              </div>
            </div>

            {/* Errors */}
            {invalidCount > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-4">
                <h3 className="text-sm font-semibold text-red-600 mb-2">
                  {t("import.validationErrors")}
                </h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {parsedRows
                    .filter((r) => !r.valid)
                    .map((r) => (
                      <div key={r.rowNumber} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <span className="font-medium">Row {r.rowNumber}:</span> {r.errors.join(", ")}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">{t("posts.account")}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">{t("posts.caption")}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">{t("posts.mediaType")}</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Schedule</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 50).map((row) => (
                      <tr key={row.rowNumber} className={row.valid ? "" : "bg-red-50"}>
                        <td className="px-4 py-3 text-gray-400">{row.rowNumber}</td>
                        <td className="px-4 py-3 font-medium">@{row.accountUsername}</td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{row.caption || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{row.mediaType}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.scheduleDate} {row.scheduleTime}</td>
                        <td className="px-4 py-3">
                          {row.valid ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">OK</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Error</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <div className="px-4 py-2 bg-gray-50 text-sm text-gray-400 border-t">
                  Showing 50 of {parsedRows.length} rows
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
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
                onClick={() => { setParsedRows([]); setStep("upload"); }}
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
