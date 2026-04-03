"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { useI18n } from "@/lib/i18n-context";
import { trpc } from "@/lib/trpc-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-200 border-gray-300 text-gray-700",
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  publishing: "bg-yellow-100 border-yellow-300 text-yellow-800",
  published: "bg-green-100 border-green-300 text-green-800",
  failed: "bg-red-100 border-red-300 text-red-800",
};

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = days[0].getDay(); // 0=Sun
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(firstDayOfWeek).fill(null);

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { t } = useI18n();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string>("");

  // Fetch all posts for this month
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const posts = trpc.posts.list.useQuery({
    from: startOfMonth.toISOString(),
    to: endOfMonth.toISOString(),
    limit: 100,
    offset: 0,
  });

  const router = useRouter();
  const groups = trpc.groups.list.useQuery();
  const utils = trpc.useUtils();
  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
    },
  });

  const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);

  type PostItem = NonNullable<typeof posts.data>["posts"][number];

  // Group posts by date
  const postsByDate = useMemo(() => {
    const map = new Map<string, PostItem[]>();
    if (!posts.data?.posts) return map;

    for (const post of posts.data.posts) {
      if (!post.scheduledAt) continue;
      if (filterGroupId && post.groupId !== filterGroupId) continue;
      const key = formatDateKey(new Date(post.scheduledAt));
      const existing = map.get(key) ?? [];
      existing.push(post);
      map.set(key, existing);
    }
    return map;
  }, [posts.data, filterGroupId]);

  const selectedDayPosts = selectedDay ? (postsByDate.get(selectedDay) ?? []) : [];

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(formatDateKey(today));
  };

  const todayKey = formatDateKey(today);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t("calendar.title")}</h1>
          <div className="flex items-center gap-3">
            {/* Group filter */}
            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t("groups.allAccounts")}</option>
              {groups.data?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.memberCount})
                </option>
              ))}
            </select>
            <Link
              href="/posts/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {t("posts.createPost")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                &larr;
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  {t("calendar.today")}
                </button>
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                &rarr;
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
              {weeks.flat().map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="bg-gray-50 min-h-[100px]" />;
                }

                const key = formatDateKey(day);
                const dayPosts = postsByDate.get(key) ?? [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`bg-white min-h-[100px] p-2 cursor-pointer transition-colors hover:bg-blue-50 ${
                      isSelected ? "ring-2 ring-blue-500 ring-inset" : ""
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday
                        ? "w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center"
                        : "text-gray-700"
                    }`}>
                      {day.getDate()}
                    </div>

                    {/* Post indicators */}
                    <div className="space-y-1">
                      {dayPosts.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          className={`text-xs px-1.5 py-0.5 rounded border truncate ${STATUS_COLORS[post.status]}`}
                        >
                          @{post.account?.username}
                        </div>
                      ))}
                      {dayPosts.length > 3 && (
                        <div className="text-xs text-gray-400 px-1">
                          +{dayPosts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {selectedDay ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  <Link
                    href={`/posts/new?date=${selectedDay}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + {t("calendar.addPost")}
                  </Link>
                </div>

                {selectedDayPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">{t("calendar.noPostsThisDay")}</p>
                    <Link
                      href={`/posts/new?date=${selectedDay}`}
                      className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      {t("posts.createPost")}
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {post.account?.profilePicUrl ? (
                            <img src={post.account.profilePicUrl} alt="" className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200" />
                          )}
                          <span className="text-sm font-medium">@{post.account?.username}</span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                            {post.status}
                          </span>
                        </div>
                        {post.caption && (
                          <p className="text-xs text-gray-500 truncate mt-1">{post.caption}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </p>
                        {post.media?.[0] && post.media[0].mediaType === "image" && (
                          <img
                            src={post.media[0].mediaUrl}
                            alt=""
                            className="mt-2 w-full h-24 object-cover rounded"
                          />
                        )}
                        <div className="flex gap-2 mt-2 pt-2 border-t border-gray-50">
                          {post.errorMessage && (
                            <p className="text-xs text-red-500 flex-1 truncate" title={post.errorMessage}>
                              {post.errorMessage}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              if (confirm("Delete this post?")) {
                                deletePost.mutate({ id: post.id });
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">{t("calendar.dragToSchedule")}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
