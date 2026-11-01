import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { NoticeTag } from "@/content/notices";
import { inLocale } from "@/content/types";
import { getPublicNotices } from "@/lib/notices";
import { card } from "./ui";

const tagStyle: Record<NoticeTag, string> = {
  exam: "bg-brand text-white",
  batch: "bg-accent text-ink",
  result: "bg-emerald-700 text-white",
  holiday: "bg-ink/10 text-ink",
};

/** The home page shows the latest few; older ones stay in the Sheet until the office deletes them. */
const MAX_NOTICES = 6;

/** Notices posted from the office (pinned first, newest first), from a cached copy of the Sheet. */
export async function NoticeBoard() {
  const [locale, t, format, notices] = await Promise.all([
    getLocale(),
    getTranslations("notices"),
    getFormatter(),
    getPublicNotices(),
  ]);

  if (notices.length === 0) return <p className="text-muted">{t("empty")}</p>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {notices.slice(0, MAX_NOTICES).map((notice) => {
        const date = notice.date ? new Date(`${notice.date}T00:00:00+06:00`) : null;
        return (
          <li key={notice.id} className={`${card} flex gap-4 p-5 ${notice.pinned ? "ring-2 ring-accent" : ""}`}>
            {date && (
              <time
                dateTime={notice.date}
                className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-surface py-2 text-center leading-tight"
              >
                <span className="text-2xl font-semibold text-brand">{format.dateTime(date, { day: "numeric" })}</span>
                <span className="text-xs font-medium text-muted">{format.dateTime(date, { month: "short" })}</span>
              </time>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className={`rounded px-1.5 py-0.5 ${tagStyle[notice.tag]}`}>{t(`tags.${notice.tag}`)}</span>
                {notice.pinned && (
                  <span className="flex items-center gap-1 text-muted">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
                      <path d="M16 3l5 5-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z" />
                    </svg>
                    {t("pinned")}
                  </span>
                )}
              </p>
              <h3 className="mt-2 font-semibold text-ink">{inLocale(notice.title, locale)}</h3>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted">{inLocale(notice.body, locale)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
