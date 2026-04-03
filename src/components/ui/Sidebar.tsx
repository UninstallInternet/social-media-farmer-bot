"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { LanguageSwitcher } from "./LanguageSwitcher";

const navSections: { label?: string; items: { href: string; labelKey: string; icon: string }[] }[] = [
  {
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: "📊" },
      { href: "/calendar", labelKey: "calendar.title", icon: "📅" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/posts/new", labelKey: "nav.newPost", icon: "➕" },
      { href: "/import", labelKey: "nav.import", icon: "📥" },
      { href: "/templates", labelKey: "nav.templates", icon: "📋" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/groups", labelKey: "groups.title", icon: "📁" },
      { href: "/accounts", labelKey: "nav.accounts", icon: "👤" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">IG Scheduler</h1>
        <p className="text-sm text-gray-500 mt-1">Multi-account manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-4">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/calendar" &&
                    pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
