"use client";

import { useI18n } from "@/lib/i18n-context";
import { SUPPORTED_LOCALES, type Locale } from "@/server/lib/i18n";

const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Espanol",
};

const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{t("language.switch")}:</span>
      <div className="flex gap-1">
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              locale === loc
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <span>{localeFlags[loc]}</span>
            <span>{localeLabels[loc]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
