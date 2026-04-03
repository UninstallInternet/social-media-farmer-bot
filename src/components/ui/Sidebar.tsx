"use client";

import { useState } from "react";
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
      { href: "/gallery", labelKey: "gallery.title", icon: "🖼" },
      { href: "/import", labelKey: "nav.import", icon: "📥" },
      { href: "/templates", labelKey: "nav.templates", icon: "📋" },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/groups", labelKey: "groups.title", icon: "📁" },
      { href: "/accounts", labelKey: "nav.accounts", icon: "👤" },
      { href: "/logs", labelKey: "logs.title", icon: "📜" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">IG Scheduler</h1>
          <p className="text-sm text-gray-500 mt-1">Multi-account manager</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
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
                    onClick={() => setOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className="p-1 text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-bold text-gray-900">IG Scheduler</span>
        <div className="w-6" />
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col min-h-screen shrink-0">
        {navContent}
      </aside>
    </>
  );
}
