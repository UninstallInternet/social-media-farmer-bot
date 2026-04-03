"use client";

import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";

export default function TemplatesPage() {
  const { t } = useI18n();
  const templates = trpc.templates.list.useQuery();
  const utils = trpc.useUtils();

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setShowForm(false);
      setName("");
      setCaptionTemplate("");
      setDefaultHashtags("");
    },
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => utils.templates.list.invalidate(),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [captionTemplate, setCaptionTemplate] = useState("");
  const [defaultHashtags, setDefaultHashtags] = useState("");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("templates.title")}</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {t("templates.createTemplate")}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("templates.name")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("templates.captionTemplate")}
                </label>
                <textarea
                  value={captionTemplate}
                  onChange={(e) => setCaptionTemplate(e.target.value)}
                  rows={3}
                  placeholder="Use {{caption}} for dynamic content"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("templates.defaultHashtags")}
                </label>
                <input
                  type="text"
                  value={defaultHashtags}
                  onChange={(e) => setDefaultHashtags(e.target.value)}
                  placeholder="#hashtag1 #hashtag2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    createTemplate.mutate({
                      name,
                      captionTemplate,
                      defaultHashtags,
                    })
                  }
                  disabled={!name || createTemplate.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {templates.isLoading ? (
          <p className="text-gray-500">{t("common.loading")}</p>
        ) : templates.data?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">{t("templates.noTemplates")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.data?.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    {template.captionTemplate && (
                      <p className="text-sm text-gray-500 mt-1">
                        {template.captionTemplate}
                      </p>
                    )}
                    {template.defaultHashtags && (
                      <p className="text-sm text-blue-600 mt-1">
                        {template.defaultHashtags}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(t("common.confirm") + "?")) {
                        deleteTemplate.mutate({ id: template.id });
                      }
                    }}
                    className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded"
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
