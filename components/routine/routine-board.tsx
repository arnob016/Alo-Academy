"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { weekdays, type Level, type Weekday } from "@/content/courses";
import {
  batchCalendar,
  clockDate,
  dhakaClock,
  isInSession,
  nextClassStart,
  toMinutes,
  weekdayDate,
  type Slot,
} from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { card } from "../ui";

export type RoutineBatch = {
  /** "courseId:batchId" */
  key: string;
  courseId: string;
  courseName: string;
  level: Level;
  batchLabel: string;
  slot: Slot;
  subjects: string[];
};

// Same per-level colours as the course cards.
const levelBar: Record<Level, string> = { ssc: "bg-brand", hsc: "bg-accent", admission: "bg-ink/60" };
const levelCell: Record<Level, string> = {
  ssc: "bg-brand/10 text-brand",
  hsc: "bg-accent/25 text-ink",
  admission: "bg-ink/10 text-ink",
};

type Status = "live" | "done" | "upcoming";
const statusStyle: Record<Status, string> = {
  live: "bg-emerald-600 text-white",
  done: "bg-ink/10 text-muted",
  upcoming: "bg-brand/10 text-brand",
};

export function RoutineBoard({ batches, location }: { batches: RoutineBatch[]; location: string }) {
  const t = useTranslations("routine");
  const format = useFormatter();
  const now = useNow();
  const [courseId, setCourseId] = useState("all");
  const [picked, setPicked] = useState<Weekday | null>(null);

  const today = now === null ? null : dhakaClock(new Date(now));
  const day = picked ?? today?.day ?? "sat";
  const visible = courseId === "all" ? batches : batches.filter((b) => b.courseId === courseId);
  const courseOptions = [...new Map(batches.map((b) => [b.courseId, b.courseName])).entries()];
  const byStart = (a: RoutineBatch, b: RoutineBatch) => toMinutes(a.slot.start) - toMinutes(b.slot.start);
  const dayClasses = visible.filter((b) => b.slot.days.includes(day)).sort(byStart);

  const time = (minutes: number) => format.dateTime(clockDate(minutes), { hour: "numeric", minute: "2-digit" });
  const range = (slot: Slot) => `${time(toMinutes(slot.start))} – ${time(toMinutes(slot.end))}`;
  const dayName = (d: Weekday, weekday: "long" | "short") => format.dateTime(weekdayDate(d), { weekday });

  function status(b: RoutineBatch): Status | null {
    if (!today || day !== today.day) return null;
    if (today.minutes >= toMinutes(b.slot.end)) return "done";
    return today.minutes >= toMinutes(b.slot.start) ? "live" : "upcoming";
  }

  function download(b: RoutineBatch) {
    const ics = batchCalendar({
      uid: `${b.key}@alo-academy`,
      title: `${b.courseName} — ${b.batchLabel}`,
      description: t("calendarNote", { batch: b.batchLabel }),
      location,
      slot: b.slot,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${b.key.replace(":", "-")}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-8">
      <NowNext now={now} batches={visible} time={time} dayName={dayName} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div role="group" aria-label={t("days")} className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {weekdays.map((d) => {
            const count = visible.filter((b) => b.slot.days.includes(d)).length;
            const selected = d === day;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setPicked(d)}
                aria-pressed={selected}
                className={`flex min-w-[4.75rem] shrink-0 flex-col items-center rounded-lg border px-3 py-2 transition-colors ${
                  selected ? "border-brand bg-brand text-white" : "border-brand/15 bg-white text-ink hover:border-brand/40"
                }`}
              >
                <span className="font-semibold">{dayName(d, "short")}</span>
                <span className={`text-xs ${selected ? "text-white/80" : "text-muted"}`}>
                  {today?.day === d ? t("today") : count ? t("classes", { count }) : t("off")}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex shrink-0 flex-col text-sm font-medium text-ink">
          {t("filter")}
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="mt-1.5 rounded-md border border-ink/25 bg-white px-3 py-2 text-base"
          >
            <option value="all">{t("allCourses")}</option>
            {courseOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section aria-labelledby="day-agenda">
        <h2 id="day-agenda" className="text-xl font-semibold text-brand">
          {dayName(day, "long")}
          {today?.day === day && <span className="ml-2 text-base font-normal text-muted">· {t("today")}</span>}
        </h2>
        {day === "fri" ? (
          <p className={`${card} mt-4 p-6 text-muted`}>{t("holiday")}</p>
        ) : dayClasses.length === 0 ? (
          <p className={`${card} mt-4 p-6 text-muted`}>{t("empty")}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {dayClasses.map((b) => {
              const s = status(b);
              return (
                <li key={b.key} className={`${card} relative flex flex-col gap-4 overflow-hidden p-5 pl-6 sm:flex-row sm:items-center`}>
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${levelBar[b.level]}`} />
                  <p className="w-44 shrink-0 font-semibold text-ink tabular-nums">{range(b.slot)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{b.courseName}</span>
                      {s && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle[s]}`}>{t(`status.${s}`)}</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {b.batchLabel} · {b.subjects.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => download(b)}
                    className="flex shrink-0 items-center gap-2 self-start rounded-md border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white sm:self-center"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
                    </svg>
                    {t("addCalendar")}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="week-glance">
        <h2 id="week-glance" className="text-xl font-semibold text-brand">
          {t("weekTitle")}
        </h2>
        <div className={`${card} relative mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-brand/10 text-left">
                <th scope="col" className="p-3 font-semibold text-ink">
                  {t("batch")}
                </th>
                {weekdays.map((d) => (
                  <th
                    key={d}
                    scope="col"
                    className={`p-3 text-center font-semibold ${d === day ? "bg-brand/5 text-brand" : "text-ink"}`}
                  >
                    {dayName(d, "short")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/10">
              {[...visible].sort(byStart).map((b) => (
                <tr key={b.key}>
                  <th scope="row" className="p-3 text-left font-normal">
                    <span className="block font-medium text-ink">{b.courseName}</span>
                    <span className="text-muted">{b.batchLabel}</span>
                  </th>
                  {weekdays.map((d) => (
                    <td key={d} className={`p-1.5 text-center ${d === day ? "bg-brand/5" : ""}`}>
                      {b.slot.days.includes(d) ? (
                        <span className={`block rounded-md px-1.5 py-2 text-xs font-semibold tabular-nums ${levelCell[b.level]}`}>
                          {time(toMinutes(b.slot.start))}
                        </span>
                      ) : (
                        <>
                          <span aria-hidden="true" className="text-ink/25">
                            —
                          </span>
                          <span className="sr-only">{t("off")}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function NowNext({
  now,
  batches,
  time,
  dayName,
}: {
  now: number | null;
  batches: RoutineBatch[];
  time: (minutes: number) => string;
  dayName: (d: Weekday, weekday: "long" | "short") => string;
}) {
  const t = useTranslations("routine");
  const format = useFormatter();

  const box = "min-h-24 rounded-2xl bg-brand p-5 text-white shadow-lg sm:p-6";
  if (now === null) return <div aria-busy="true" className={box} />;

  const date = new Date(now);
  const live = batches.filter((b) => isInSession(b.slot, date));
  const upcoming = batches
    .map((b) => ({ b, at: nextClassStart(b.slot, date) }))
    .filter((x): x is { b: RoutineBatch; at: Date } => x.at !== null)
    .sort((x, y) => x.at.getTime() - y.at.getTime());
  const soonest = upcoming[0]?.at.getTime();
  const next = upcoming.filter((x) => x.at.getTime() === soonest);

  return (
    <div aria-live="polite" className={`${box} grid gap-5 sm:grid-cols-2`}>
      {live.length > 0 && (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-accent">
            <span className="relative flex size-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 motion-reduce:hidden" />
              <span className="relative size-2.5 rounded-full bg-emerald-300" />
            </span>
            {t("now")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {live.map((b) => (
              <li key={b.key}>
                <span className="font-semibold">{b.courseName}</span>
                <span className="text-white/75">
                  {" "}
                  · {b.batchLabel} · {t("until", { time: time(toMinutes(b.slot.end)) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-accent">{t("next")}</p>
        {next.length === 0 ? (
          <p className="mt-2 text-white/80">{t("noneThisWeek")}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {next.map(({ b, at }) => {
              const sameDay = dhakaClock(at).day === dhakaClock(date).day && at.getTime() - now < 86_400_000;
              return (
                <li key={b.key}>
                  <span className="font-semibold">{b.courseName}</span>
                  <span className="text-white/75">
                    {" "}
                    · {b.batchLabel} ·{" "}
                    {t("at", {
                      day: sameDay ? t("today") : dayName(dhakaClock(at).day, "long"),
                      time: time(toMinutes(b.slot.start)),
                    })}{" "}
                    ({format.relativeTime(at, date)})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
