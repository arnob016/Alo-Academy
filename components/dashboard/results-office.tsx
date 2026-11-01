"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { OfficeCourse } from "@/content/courses";
import { inLocale } from "@/content/types";
import { listOfficeStudents } from "@/lib/office-actions";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { deleteOfficeExam, listOfficeExams, saveOfficeExam, type OfficeExam } from "@/lib/publish-actions";
import { dhakaDateKey } from "@/lib/schedule";
import { card } from "../ui";
import {
  btnDanger,
  btnOutline,
  btnPrimary,
  englishDigits,
  ErrorNote,
  inputClass,
  labelClass,
  OfficeState,
  SampleBadge,
  SourceBar,
  useErrorText,
  useOfficeData,
} from "./office-ui";

type Row = { key: number; roll: string; name: string; marks: string };

// Row keys only need to be unique on this page.
let lastKey = 0;
const newKey = () => ++lastKey;
const toRows = (items: Omit<Row, "key">[]) => items.map((item) => ({ ...item, key: newKey() }));

export function ResultsOffice({ courses }: { courses: OfficeCourse[] }) {
  const t = useTranslations("office.results");
  const tOffice = useTranslations("office");
  const locale = useLocale();
  const format = useFormatter();
  const errorText = useErrorText();
  const { state, reload, reloadError } = useOfficeData(listOfficeExams);
  const [editing, setEditing] = useState<OfficeExam | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<OfficeErrorKey | null>(null);
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? "—";

  async function remove(exam: OfficeExam) {
    if (!window.confirm(t("deleteConfirm", { title: inLocale(exam.title, locale) }))) return;
    setDeleting(exam.id);
    setError(null);
    const res = await deleteOfficeExam(exam.id).catch(() => ({ ok: false as const, error: "generic" as const }));
    setDeleting(null);
    if (!res.ok) return setError(res.error);
    await reload();
  }

  if (editing !== null) {
    return (
      <ExamEditor
        key={editing === "new" ? "new" : editing.id}
        exam={editing === "new" ? null : editing}
        courses={courses}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void reload();
        }}
      />
    );
  }

  return (
    <OfficeState state={state}>
      {(data) => (
        <div className="space-y-6">
          <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError}>
            <Link href={`/${locale}/results`} className={btnOutline}>
              {t("viewPublic")}
            </Link>
            <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
              {t("add")}
            </button>
          </SourceBar>

          <div aria-live="polite">{error && <ErrorNote>{errorText(error)}</ErrorNote>}</div>

          {data.exams.length === 0 ? (
            <p className={`${card} p-6 text-muted`}>{t("empty")}</p>
          ) : (
            <ul className="space-y-4">
              {data.exams.map((exam) => {
                const marks = exam.scores.map((s) => s[2]);
                const average = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
                const passed = marks.filter((m) => m >= exam.passMarks).length;
                return (
                  <li key={exam.id} className={`${card} flex flex-wrap items-start justify-between gap-4 p-5`}>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                        <span>{courseName(exam.courseId)}</span>
                        <span>·</span>
                        <span>{exam.date ? format.dateTime(new Date(`${exam.date}T00:00:00+06:00`), { dateStyle: "medium" }) : "—"}</span>
                        {exam.origin === "sample" && <SampleBadge />}
                        {exam.origin === "memory" && data.source === "sheet" && (
                          <span className="rounded bg-ink/10 px-1.5 py-0.5 text-ink">{t("demoOnly")}</span>
                        )}
                      </p>
                      <h2 className="mt-2 font-semibold text-ink">{inLocale(exam.title, locale)}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {t("summary", {
                          count: marks.length,
                          average: Math.round(average * 10) / 10,
                          full: exam.fullMarks,
                          passed,
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="flex gap-2">
                        <button type="button" onClick={() => setEditing(exam)} disabled={exam.lock !== null} className={btnOutline}>
                          {t("edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(exam)}
                          disabled={exam.lock !== null || deleting === exam.id}
                          className={btnDanger}
                        >
                          {t("delete")}
                        </button>
                      </span>
                      {exam.lock && <span className="max-w-56 text-right text-xs text-muted">{errorText(exam.lock)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-sm text-muted">{tOffice("publicCache")}</p>
        </div>
      )}
    </OfficeState>
  );
}

/** "1201, Rahat Karim, 47" / "1201<TAB>47" lines (as pasted from Excel) → rows. */
function parsePasted(text: string): Omit<Row, "key">[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const parts = line.split(/\t|,|\|/).map((p) => p.trim());
    if (parts.length < 2 || !parts[0]) return [];
    const roll = englishDigits(parts[0]);
    // Skip a header row such as "Roll, Name, Marks".
    if (!/\d/.test(roll)) return [];
    const marks = englishDigits(parts[parts.length - 1]);
    const name = parts.length >= 3 ? parts.slice(1, -1).join(" ") : "";
    return [{ roll, name, marks }];
  });
}

function ExamEditor({
  exam,
  courses,
  onCancel,
  onSaved,
}: {
  exam: OfficeExam | null;
  courses: OfficeCourse[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("office.results");
  const tOffice = useTranslations("office");
  const errorText = useErrorText();

  const [values, setValues] = useState({
    courseId: exam?.courseId || courses[0]?.id || "",
    date: exam?.date || dhakaDateKey(new Date()),
    titleBn: exam?.title.bn ?? "",
    titleEn: exam?.title.en ?? "",
    fullMarks: exam ? String(exam.fullMarks) : "100",
    passMarks: exam ? String(exam.passMarks) : "33",
  });
  const [rows, setRows] = useState<Row[]>(() =>
    exam?.scores.length
      ? toRows(exam.scores.map(([roll, name, marks]) => ({ roll, name, marks: String(marks) })))
      : toRows([{ roll: "", name: "", marks: "" }]),
  );
  const [paste, setPaste] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, OfficeErrorKey>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, OfficeErrorKey>>({});
  const [formError, setFormError] = useState<OfficeErrorKey | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (field: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  /** Adds rows for rolls not in the table yet; fills in blank names and marks of rolls that are. */
  function merge(items: Omit<Row, "key">[]) {
    setRows((prev) => {
      const kept = prev.filter((r) => r.roll || r.name || r.marks);
      const next = kept.map((r) => ({ ...r }));
      for (const item of items) {
        const existing = item.roll ? next.find((r) => r.roll === item.roll) : undefined;
        if (existing) {
          existing.name ||= item.name;
          existing.marks ||= item.marks;
        } else {
          next.push({ ...item, key: newKey() });
        }
      }
      return next.length ? next : toRows([{ roll: "", name: "", marks: "" }]);
    });
  }

  async function fillFromRoster() {
    setFilling(true);
    setFillNote(null);
    const res = await listOfficeStudents().catch(() => null);
    setFilling(false);
    if (!res?.ok) return setFillNote(errorText(res && !res.ok ? res.error : "generic"));
    const students = res.students.filter((s) => s.courseId === values.courseId && s.status === "Active");
    merge(students.map((s) => ({ roll: s.roll, name: s.name, marks: "" })));
    const noRoll = students.filter((s) => !s.roll).length;
    setFillNote(students.length ? (noRoll ? t("rosterNoRoll", { count: noRoll }) : t("rosterAdded", { count: students.length })) : t("rosterEmpty"));
  }

  const entered = rows.filter((r) => r.marks.trim() !== "");
  const full = Number(englishDigits(values.fullMarks));
  const enteredMarks = entered.map((r) => Number(englishDigits(r.marks))).filter((m) => Number.isFinite(m));
  const average = enteredMarks.length ? enteredMarks.reduce((a, b) => a + b, 0) / enteredMarks.length : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    // Rows without marks are students who were absent; they're left out.
    const sent = rows.filter((r) => r.marks.trim() !== "");
    const local: Record<number, OfficeErrorKey> = {};
    for (const r of sent) {
      if (!r.roll.trim()) local[r.key] = "roll";
      else if (!Number.isFinite(Number(englishDigits(r.marks)))) local[r.key] = "marks";
    }
    setRowErrors(local);
    if (Object.keys(local).length) return setFormError("scores");

    setBusy(true);
    const res = await saveOfficeExam({
      id: exam?.id ?? "",
      courseId: values.courseId,
      date: values.date,
      titleBn: values.titleBn,
      titleEn: values.titleEn,
      fullMarks: Number(englishDigits(values.fullMarks)),
      passMarks: Number(englishDigits(values.passMarks)),
      scores: sent.map((r) => ({ roll: r.roll, name: r.name, marks: Number(englishDigits(r.marks)) })),
    }).catch(() => ({ ok: false as const, error: "generic" as const, fields: undefined }));
    setBusy(false);
    if (res.ok) return onSaved();

    const fields = res.fields ?? {};
    const byRow: Record<number, OfficeErrorKey> = {};
    const other: Record<string, OfficeErrorKey> = {};
    for (const [path, key] of Object.entries(fields)) {
      const m = path.match(/^scores\.(\d+)\./);
      if (m && sent[Number(m[1])]) byRow[sent[Number(m[1])].key] = key;
      else other[path] = key;
    }
    setRowErrors(byRow);
    setErrors(other);
    const shown = ["courseId", "date", "titleBn", "titleEn", "fullMarks", "passMarks"];
    const unshown = Object.keys(other).filter((p) => !shown.includes(p));
    if (Object.keys(byRow).length) setFormError("scores");
    else if (unshown.length) setFormError(other[unshown[0]]);
    else if (!Object.keys(fields).length) setFormError(res.error === "required" ? "generic" : res.error);
  }

  const fieldError = (name: string) =>
    errors[name] ? <span className="text-sm font-normal text-red-800">{errorText(errors[name])}</span> : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-brand">{exam ? t("editTitle") : t("addTitle")}</h2>
        <button type="button" onClick={onCancel} className={btnOutline}>
          {t("back")}
        </button>
      </div>

      <section className={`${card} space-y-4 p-5`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`${labelClass} sm:col-span-2`}>
            {t("course")}
            <select value={values.courseId} onChange={(e) => set("courseId")(e.target.value)} className={inputClass}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldError("courseId")}
          </label>
          <label className={labelClass}>
            {t("date")}
            <input type="date" value={values.date} onChange={(e) => set("date")(e.target.value)} className={inputClass} />
            {fieldError("date")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              {t("fullMarks")}
              <input value={values.fullMarks} onChange={(e) => set("fullMarks")(e.target.value)} inputMode="numeric" className={`${inputClass} tabular-nums`} />
              {fieldError("fullMarks")}
            </label>
            <label className={labelClass}>
              {t("passMarks")}
              <input value={values.passMarks} onChange={(e) => set("passMarks")(e.target.value)} inputMode="decimal" className={`${inputClass} tabular-nums`} />
              {fieldError("passMarks")}
            </label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            {t("titleBn")}
            <input lang="bn" value={values.titleBn} onChange={(e) => set("titleBn")(e.target.value)} maxLength={150} className={inputClass} />
            {fieldError("titleBn")}
          </label>
          <label className={labelClass}>
            {t("titleEn")}
            <input lang="en" value={values.titleEn} onChange={(e) => set("titleEn")(e.target.value)} maxLength={150} className={inputClass} />
            {fieldError("titleEn")}
          </label>
        </div>
        <p className="text-sm text-muted">{t("titleHint")}</p>
      </section>

      <section aria-labelledby="scores-title" className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/10 p-5">
          <div>
            <h3 id="scores-title" className="text-lg font-semibold text-brand">
              {t("scores")}
            </h3>
            <p className="text-sm text-muted">{t("scoresHint")}</p>
          </div>
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void fillFromRoster()} disabled={filling} className={btnOutline}>
              {filling ? tOffice("loading") : t("fillRoster")}
            </button>
            <button type="button" onClick={() => setPaste(paste === null ? "" : null)} aria-expanded={paste !== null} className={btnOutline}>
              {t("paste")}
            </button>
          </span>
        </div>
        <div aria-live="polite">{fillNote && <p className="border-b border-brand/10 bg-surface px-5 py-3 text-sm text-ink">{fillNote}</p>}</div>

        {paste !== null && (
          <div className="space-y-3 border-b border-brand/10 bg-surface p-5">
            <label className={labelClass}>
              {t("pasteLabel")}
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={5}
                placeholder={"1201\tRahat Karim\t47\n1202\tNusrat Jahan\t44"}
                className={`${inputClass} font-mono text-sm`}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                merge(parsePasted(paste));
                setPaste(null);
              }}
              disabled={!paste.trim()}
              className={btnPrimary}
            >
              {t("pasteAdd")}
            </button>
          </div>
        )}

        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="px-5 py-2 font-semibold">{t("roll")}</th>
                <th scope="col" className="py-2 font-semibold">{t("name")}</th>
                <th scope="col" className="py-2 font-semibold">{t("marks", { full: Number.isFinite(full) ? full : 0 })}</th>
                <th scope="col" className="px-5 py-2">
                  <span className="sr-only">{t("remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/10">
              {rows.map((r, i) => {
                const update = (field: "roll" | "name" | "marks") => (value: string) =>
                  setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, [field]: value } : x)));
                const rowError = rowErrors[r.key];
                return (
                  <tr key={r.key} className={rowError ? "bg-red-50" : ""}>
                    <td className="px-5 py-2">
                      <input
                        value={r.roll}
                        onChange={(e) => update("roll")(englishDigits(e.target.value))}
                        aria-label={t("rowRoll", { n: i + 1 })}
                        maxLength={12}
                        className={`${inputClass} w-28 tabular-nums`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input value={r.name} onChange={(e) => update("name")(e.target.value)} aria-label={t("rowName", { n: i + 1 })} maxLength={60} className={inputClass} />
                    </td>
                    <td className="py-2">
                      <input
                        value={r.marks}
                        onChange={(e) => update("marks")(englishDigits(e.target.value))}
                        aria-label={t("rowMarks", { n: i + 1 })}
                        aria-invalid={Boolean(rowError)}
                        inputMode="decimal"
                        placeholder={t("absent")}
                        className={`${inputClass} w-24 tabular-nums`}
                      />
                      {rowError && <p className="mt-1 text-xs text-red-800">{errorText(rowError)}</p>}
                    </td>
                    <td className="px-5 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : toRows([{ roll: "", name: "", marks: "" }])))}
                        aria-label={t("removeRow", { n: i + 1 })}
                        className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-800"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand/10 px-5 py-3">
          <button type="button" onClick={() => setRows((prev) => [...prev, ...toRows([{ roll: "", name: "", marks: "" }])])} className={btnOutline}>
            {t("addRow")}
          </button>
          <p className="text-sm text-muted">
            {t("entered", { count: entered.length, average: Math.round(average * 10) / 10 })}{" "}
            {rows.length > entered.length && t("absentCount", { count: rows.length - entered.length })}
          </p>
        </div>
      </section>

      <div aria-live="polite">{formError && <ErrorNote>{errorText(formError)}</ErrorNote>}</div>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className={btnOutline}>
          {tOffice("cancel")}
        </button>
        <button type="submit" disabled={busy || entered.length === 0} className={btnPrimary}>
          {busy ? tOffice("saving") : t("publish")}
        </button>
      </div>
      <p className="text-right text-sm text-muted">{t("publishHint")}</p>
    </form>
  );
}
