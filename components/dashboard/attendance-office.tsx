"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations, type DateTimeFormatOptions } from "next-intl";
import type { OfficeCourse } from "@/content/courses";
import { getOfficeAttendance, saveOfficeAttendance, type AttendanceResult } from "@/lib/office-actions";
import { attendanceMarks, type Mark } from "@/lib/office-constants";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { classStartOn, dhakaDateKey, pastClassDates } from "@/lib/schedule";
import type { Student } from "@/lib/students";
import { card } from "../ui";
import { btnOutline, btnPrimary, ErrorNote, inputClass, labelClass, OfficeState, SampleBadge, SourceBar, useErrorText, useOfficeData } from "./office-ui";

type Data = Extract<AttendanceResult, { ok: true }>;
type Batch = OfficeCourse["batches"][number];
const HISTORY = 10;
/** This many absences in a row (most recent classes) gets a warning. */
const STREAK = 3;

const markStyle: Record<Mark, { on: string; cell: string }> = {
  P: { on: "border-emerald-700 bg-emerald-700 text-white", cell: "bg-emerald-100 text-emerald-900" },
  A: { on: "border-red-700 bg-red-700 text-white", cell: "bg-red-100 text-red-900" },
  L: { on: "border-amber-600 bg-amber-500 text-ink", cell: "bg-amber-100 text-amber-900" },
};

export function AttendanceOffice({ courses }: { courses: OfficeCourse[] }) {
  const t = useTranslations("office.attendance");
  const [key, setKey] = useState(() => `${courses[0]?.id}:${courses[0]?.batches[0]?.id}`);
  const [courseId, batchId] = key.split(":");
  const course = courses.find((c) => c.id === courseId);
  const batch = course?.batches.find((b) => b.id === batchId);

  return (
    <div className="space-y-8">
      <label className={`${labelClass} max-w-md`}>
        {t("batch")}
        <select value={key} onChange={(e) => setKey(e.target.value)} className={inputClass}>
          {courses.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {c.batches.map((b) => (
                <option key={b.id} value={`${c.id}:${b.id}`}>
                  {c.name} · {b.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {/* Remount per batch, so one batch's register never shows under another's name. */}
      {course && batch && <BatchAttendance key={key} course={course} batch={batch} />}
    </div>
  );
}

function BatchAttendance({ course, batch }: { course: OfficeCourse; batch: Batch }) {
  const load = useCallback(() => getOfficeAttendance(course.id, batch.id), [course.id, batch.id]);
  const { state, reload, reloadError } = useOfficeData(load);
  return (
    <OfficeState state={state}>
      {(data) => <Register data={data} course={course} batch={batch} reload={reload} reloadError={reloadError} />}
    </OfficeState>
  );
}

function Register({
  data,
  course,
  batch,
  reload,
  reloadError,
}: {
  data: Data;
  course: OfficeCourse;
  batch: Batch;
  reload: () => Promise<void>;
  reloadError: boolean;
}) {
  const t = useTranslations("office.attendance");
  const format = useFormatter();
  const errorText = useErrorText();
  const [today] = useState(() => dhakaDateKey(new Date()));
  const [date, setDate] = useState(() => pastClassDates(batch.slot, 1)[0] ?? today);
  const sessionOn = (d: string) => data.sessions.find((s) => s.date === d);
  const [marks, setMarks] = useState<Record<string, Mark>>(() => ({ ...sessionOn(date)?.marks }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<OfficeErrorKey | null>(null);
  const [copied, setCopied] = useState(false);

  // When fresh data arrives (after a save or refresh), show what's stored unless there are unsaved changes.
  const session = sessionOn(date);
  const [syncedWith, setSyncedWith] = useState(data);
  if (syncedWith !== data) {
    setSyncedWith(data);
    if (!dirty) setMarks({ ...session?.marks });
  }

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // The register: current students, plus anyone already marked in this class (e.g. who has since left).
  const byId = new Map(data.students.map((s) => [s.id, s]));
  const register = [
    ...data.students.filter((s) => s.status === "Active"),
    ...Object.keys(session?.marks ?? {})
      .map((id) => byId.get(id))
      .filter((s): s is Student => Boolean(s) && s!.status !== "Active"),
  ];
  const strays = Object.keys(session?.marks ?? {}).filter((id) => !byId.has(id));

  function pickDate(next: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || next > today) return;
    if (dirty && !window.confirm(t("discard"))) return;
    setDate(next);
    setMarks({ ...sessionOn(next)?.marks });
    setDirty(false);
    setSaved(false);
    setError(null);
  }

  function mark(id: string, value: Mark) {
    setMarks((m) => ({ ...m, [id]: value }));
    setDirty(true);
    setSaved(false);
  }

  function allPresent() {
    setMarks((m) => ({ ...Object.fromEntries(register.map((s) => [s.id, "P" as const])), ...m }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await saveOfficeAttendance({ courseId: course.id, batchId: batch.id, date, marks }).catch(() => ({
      ok: false as const,
      error: "generic" as const,
    }));
    setBusy(false);
    if (!res.ok) return setError(res.error === "required" ? "generic" : res.error);
    setDirty(false);
    setSaved(true);
    await reload();
  }

  const counts = Object.fromEntries(attendanceMarks.map((m) => [m, register.filter((s) => marks[s.id] === m).length])) as Record<Mark, number>;
  const unmarked = register.filter((s) => !marks[s.id]).length;
  const absentees = register.filter((s) => marks[s.id] === "A");

  async function copyAbsentees() {
    const text = absentees.map((s) => `${s.roll ? `${s.roll} ` : ""}${s.name} — ${s.guardianPhone || "—"}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied).
    }
  }

  // History: the latest classes, oldest on the left.
  const recent = data.sessions.slice(0, HISTORY).reverse();
  const historyStudents = [
    ...data.students.filter((s) => s.status === "Active"),
    ...data.students.filter((s) => s.status !== "Active" && recent.some((r) => r.marks[s.id])),
  ];
  const rate = (id: string) => {
    const marked = data.sessions.map((s) => s.marks[id]).filter(Boolean);
    return marked.length ? Math.round((marked.filter((m) => m !== "A").length / marked.length) * 100) : null;
  };
  const absentStreak = (id: string) => {
    let streak = 0;
    for (const s of data.sessions) {
      const m = s.marks[id];
      if (!m) continue;
      if (m !== "A") break;
      streak++;
    }
    return streak;
  };

  const day = (d: string, opts: DateTimeFormatOptions) => format.dateTime(new Date(`${d}T12:00:00+06:00`), opts);
  const regularDay = Boolean(classStartOn(batch.slot, date));

  return (
    <div className="space-y-8">
      <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError} />

      <section aria-labelledby="register" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand/10 p-5">
          <div>
            <h2 id="register" className="text-lg font-semibold text-brand">
              {t("register", { date: day(date, { weekday: "long", day: "numeric", month: "long" }) })}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {session
                ? t("takenBy", {
                    name: session.takenBy || "—",
                    time: session.updatedAt ? format.dateTime(new Date(session.updatedAt), { dateStyle: "medium", timeStyle: "short" }) : "—",
                  })
                : t("notTaken")}
            </p>
            {!regularDay && <p className="mt-1 text-sm font-medium text-amber-800">{t("notClassDay")}</p>}
          </div>
          <label className={labelClass}>
            {t("date")}
            <input type="date" value={date} max={today} onChange={(e) => pickDate(e.target.value)} className={`${inputClass} w-44`} />
          </label>
        </div>

        {register.length === 0 ? (
          <p className="p-6 text-muted">{t("noStudents")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-brand/10 bg-surface px-5 py-3 text-sm">
              {attendanceMarks.map((m) => (
                <span key={m} className="font-medium text-ink">
                  {t(`counts.${m}`, { count: counts[m] })}
                </span>
              ))}
              {unmarked > 0 && <span className="text-muted">{t("unmarked", { count: unmarked })}</span>}
              <span className="flex flex-1 justify-end gap-2">
                <button type="button" onClick={allPresent} disabled={unmarked === 0} className={btnOutline}>
                  {t("allPresent")}
                </button>
              </span>
            </div>
            <ul className="divide-y divide-brand/10">
              {register.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <p className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="w-12 font-semibold text-brand tabular-nums">{s.roll || "—"}</span>
                    <span className="font-medium text-ink">{s.name}</span>
                    {s.sample && <SampleBadge />}
                    {s.status !== "Active" && <span className="rounded bg-ink/10 px-1.5 py-0.5 text-xs text-ink">{t("left")}</span>}
                  </p>
                  <div role="radiogroup" aria-label={t("markFor", { name: s.name })} className="flex gap-1.5">
                    {attendanceMarks.map((m) => (
                      <label
                        key={m}
                        title={t(`marks.${m}`)}
                        className={`grid h-9 min-w-9 cursor-pointer place-items-center rounded-md border px-2.5 text-sm font-bold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                          marks[s.id] === m ? markStyle[m].on : "border-ink/20 bg-white text-ink hover:border-ink/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`mark-${s.id}`}
                          value={m}
                          checked={marks[s.id] === m}
                          onChange={() => mark(s.id, m)}
                          className="sr-only"
                        />
                        <span aria-hidden="true">{t(`short.${m}`)}</span>
                        <span className="sr-only">{t(`marks.${m}`)}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            {strays.length > 0 && <p className="border-t border-brand/10 px-5 py-3 text-sm text-muted">{t("strays", { count: strays.length })}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand/10 px-5 py-4">
              <div aria-live="polite" className="text-sm">
                {error ? (
                  <ErrorNote>{errorText(error)}</ErrorNote>
                ) : saved ? (
                  <span className="font-semibold text-emerald-800">{t("saved")}</span>
                ) : dirty ? (
                  <span className="text-muted">{t("unsaved")}</span>
                ) : null}
              </div>
              <span className="flex flex-wrap gap-2">
                {absentees.length > 0 && (
                  <button type="button" onClick={() => void copyAbsentees()} className={btnOutline}>
                    <span aria-live="polite">{copied ? t("copied") : t("copyAbsent", { count: absentees.length })}</span>
                  </button>
                )}
                <button type="button" onClick={() => void save()} disabled={busy || Object.keys(marks).length === 0} className={btnPrimary}>
                  {busy ? t("saving") : t("save")}
                </button>
              </span>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="attendance-history" className={`${card} overflow-hidden`}>
        <h2 id="attendance-history" className="border-b border-brand/10 px-5 py-4 text-lg font-semibold text-brand">
          {t("history")}
        </h2>
        {recent.length === 0 || historyStudents.length === 0 ? (
          <p className="p-6 text-muted">{t("noHistory")}</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-xs text-muted">
                  <th scope="col" className="sticky left-0 bg-surface px-5 py-2 text-left font-semibold tracking-wide uppercase">
                    {t("student")}
                  </th>
                  {recent.map((s) => (
                    <th key={s.date} scope="col" className="px-1 py-2 text-center font-semibold">
                      <button
                        type="button"
                        onClick={() => pickDate(s.date)}
                        aria-pressed={s.date === date}
                        title={t("openClass")}
                        className={`rounded px-1.5 py-0.5 leading-tight hover:bg-brand/10 ${s.date === date ? "bg-brand text-white hover:bg-brand" : ""}`}
                      >
                        <span className="block">{day(s.date, { day: "numeric" })}</span>
                        <span className="block font-normal">{day(s.date, { month: "short" })}</span>
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-5 py-2 text-right font-semibold tracking-wide uppercase">
                    {t("rate")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand/10">
                {historyStudents.map((s) => {
                  const pct = rate(s.id);
                  const streak = absentStreak(s.id);
                  return (
                    <tr key={s.id}>
                      <th scope="row" className="sticky left-0 bg-white px-5 py-2 text-left font-normal whitespace-nowrap">
                        <span className="mr-2 font-semibold text-brand tabular-nums">{s.roll}</span>
                        <span className="font-medium text-ink">{s.name}</span>
                        {streak >= STREAK && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900">
                            {t("streak", { count: streak })}
                          </span>
                        )}
                      </th>
                      {recent.map((session) => {
                        const m = session.marks[s.id];
                        return (
                          <td key={session.date} className="px-1 py-2 text-center">
                            {m ? (
                              <span title={t(`marks.${m}`)} className={`inline-grid size-7 place-items-center rounded text-xs font-bold ${markStyle[m].cell}`}>
                                {t(`short.${m}`)}
                              </span>
                            ) : (
                              <span className="text-muted" aria-label={t("notMarked")}>
                                ·
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={`px-5 py-2 text-right font-semibold tabular-nums ${
                          pct !== null && pct < 75 ? "text-red-800" : "text-ink"
                        }`}
                      >
                        {pct === null ? "—" : `${format.number(pct)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-brand/10 px-5 py-3 text-xs text-muted">{t("legend")}</p>
      </section>
    </div>
  );
}
