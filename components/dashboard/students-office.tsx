"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { OfficeCourse } from "@/content/courses";
import { listOfficeStudents, saveOfficeStudent, type StudentsResult } from "@/lib/office-actions";
import { studentStatuses, type StudentStatus } from "@/lib/office-constants";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { dhakaDateKey } from "@/lib/schedule";
import type { Student } from "@/lib/students";
import { card } from "../ui";
import {
  btnOutline,
  btnPrimary,
  chip,
  downloadCsv,
  ErrorNote,
  inputClass,
  labelClass,
  Modal,
  OfficeState,
  SampleBadge,
  SourceBar,
  unshownError,
  useErrorText,
  useOfficeData,
} from "./office-ui";

type Data = Extract<StudentsResult, { ok: true }>;
const statusFilters = ["Active", "Left", "all"] as const;

/** Display helpers shared by the roster-based office pages. */
export function useCourseLabels(courses: OfficeCourse[]) {
  return {
    course: (s: Pick<Student, "courseId" | "courseName">) => courses.find((c) => c.id === s.courseId)?.name ?? s.courseName,
    batch: (s: Pick<Student, "courseId" | "batchId" | "batchName">) =>
      courses.find((c) => c.id === s.courseId)?.batches.find((b) => b.id === s.batchId)?.name ?? s.batchName,
  };
}

export function StudentsOffice({ courses }: { courses: OfficeCourse[] }) {
  const { state, reload, reloadError } = useOfficeData(listOfficeStudents);
  return (
    <OfficeState state={state}>
      {(data) => <StudentsView data={data} courses={courses} reload={reload} reloadError={reloadError} />}
    </OfficeState>
  );
}

function StudentsView({
  data,
  courses,
  reload,
  reloadError,
}: {
  data: Data;
  courses: OfficeCourse[];
  reload: () => Promise<void>;
  reloadError: boolean;
}) {
  const t = useTranslations("office.students");
  const tOffice = useTranslations("office");
  const format = useFormatter();
  const labels = useCourseLabels(courses);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("Active");
  const [editing, setEditing] = useState<Student | "new" | null>(null);

  const all = data.students;
  const active = all.filter((s) => s.status === "Active");
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const visible = all.filter(
    (s) =>
      (statusFilter === "all" || s.status === statusFilter) &&
      (courseFilter === "all" || s.courseId === courseFilter) &&
      (!needle ||
        s.name.toLowerCase().replace(/\s+/g, "").includes(needle) ||
        s.roll.toLowerCase().includes(needle) ||
        s.id.toLowerCase().includes(needle) ||
        s.guardianPhone.replace(/\*/g, "").includes(needle) ||
        s.studentPhone.replace(/\*/g, "").includes(needle)),
  );

  // Students arrive sorted by course, batch and roll, so grouping keeps that order.
  const groups = visible.reduce<{ key: string; first: Student; students: Student[] }[]>((acc, s) => {
    const key = `${s.courseId || s.courseName}:${s.batchId || s.batchName}`;
    const group = acc.find((g) => g.key === key);
    if (group) group.students.push(s);
    else acc.push({ key, first: s, students: [s] });
    return acc;
  }, []);

  const kpis = [
    { key: "active", value: active.length },
    { key: "noRoll", value: active.filter((s) => !s.roll).length, highlight: active.some((s) => !s.roll) },
    { key: "left", value: all.length - active.length },
    { key: "batches", value: new Set(active.map((s) => `${s.courseId}:${s.batchId}`)).size },
  ] as const;

  const date = (key: string) => (key ? format.dateTime(new Date(`${key}T00:00:00+06:00`), { dateStyle: "medium" }) : "—");

  function exportCsv() {
    downloadCsv(`students-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Student ID", "Roll", "Name", "Course", "Batch", "Student phone", "Guardian phone", "Joined", "Status", "Notes"],
      ...visible.map((s) => [
        s.id,
        s.roll,
        s.name,
        labels.course(s),
        labels.batch(s),
        s.studentPhone,
        s.guardianPhone,
        s.joined,
        t(`statuses.${s.status}`),
        s.notes,
      ]),
    ]);
  }

  return (
    <div className="space-y-8">
      <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError}>
        <button type="button" onClick={exportCsv} disabled={!visible.length} className={btnOutline}>
          {tOffice("export")}
        </button>
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          {t("add")}
        </button>
      </SourceBar>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.key} className={`${card} flex flex-col p-5 ${"highlight" in kpi && kpi.highlight ? "ring-2 ring-accent" : ""}`}>
            <dt className="text-sm text-muted">{t(`kpi.${kpi.key}`)}</dt>
            <dd className="order-first text-3xl font-semibold text-brand tabular-nums">{format.number(kpi.value)}</dd>
          </div>
        ))}
      </dl>

      {/* Seats per course */}
      <section aria-labelledby="seats" className={`${card} p-5`}>
        <h2 id="seats" className="font-semibold text-brand">
          {t("seats")}
        </h2>
        <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const taken = active.filter((s) => s.courseId === c.id).length;
            return (
              <li key={c.id}>
                <p className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className={`shrink-0 font-semibold tabular-nums ${taken > c.seatsTotal ? "text-red-800" : "text-ink"}`}>
                    {t("seatsOf", { taken, total: c.seatsTotal })}
                  </span>
                </p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand/10">
                  <span className="block h-full bg-brand" style={{ width: `${Math.min(100, (taken / c.seatsTotal) * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={tOffice("filter")} className="flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <button key={f} type="button" onClick={() => setStatusFilter(f)} aria-pressed={statusFilter === f} className={chip(statusFilter === f)}>
              {t(`statuses.${f}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label={t("course")}
            className={`${inputClass} sm:w-60`}
          >
            <option value="all">{t("allCourses")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className={`${inputClass} sm:w-72`}
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className={`${card} p-6 text-muted`}>{t("empty")}</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} aria-label={`${labels.course(group.first)} · ${labels.batch(group.first)}`} className={`${card} overflow-hidden`}>
            <h2 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand/10 px-5 py-3">
              <span className="font-semibold text-brand">
                {labels.course(group.first)} · {labels.batch(group.first)}
              </span>
              <span className="text-sm text-muted">{t("count", { count: group.students.length })}</span>
            </h2>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
                    <th scope="col" className="px-5 py-2 font-semibold">{t("roll")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("name")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("guardianPhone")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("joined")}</th>
                    <th scope="col" className="py-2 font-semibold">{t("status")}</th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">
                      <span className="sr-only">{t("edit")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/10">
                  {group.students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3 font-semibold tabular-nums">
                        {s.roll ? (
                          <span className="text-brand">{s.roll}</span>
                        ) : (
                          <span className="rounded bg-accent/25 px-1.5 py-0.5 text-xs text-ink">{t("noRoll")}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{s.name}</span>
                          {s.sample && <SampleBadge />}
                        </p>
                        <p className="text-xs text-muted">
                          {s.source === "admission" ? t("fromAdmission", { ref: s.id }) : t("fromOffice")}
                          {s.notes && ` · ${s.notes}`}
                        </p>
                      </td>
                      <td className="py-3 text-muted tabular-nums">
                        <p>{s.guardianPhone || "—"}</p>
                        {s.studentPhone && <p className="text-xs">{t("studentPhoneShort", { phone: s.studentPhone })}</p>}
                      </td>
                      <td className="py-3 text-muted">{date(s.joined)}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            s.status === "Active" ? "bg-emerald-100 text-emerald-900" : "bg-ink/10 text-ink"
                          }`}
                        >
                          {t(`statuses.${s.status}`)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button type="button" onClick={() => setEditing(s)} className={btnOutline}>
                          {t("edit")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <Modal open={editing !== null} title={editing === "new" ? t("addTitle") : t("editTitle")} onClose={() => setEditing(null)}>
        {editing !== null && (
          <StudentForm
            // Remount per student so the form starts from their saved values.
            key={editing === "new" ? "new" : editing.id}
            student={editing === "new" ? null : editing}
            students={all}
            courses={courses}
            masked={data.masked}
            onSaved={() => {
              setEditing(null);
              void reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/** The next numeric roll in a course, e.g. "1213" after "1212"; "101" for a course with none. */
function nextRoll(students: Student[], courseId: string, exceptId: string | undefined) {
  const rolls = students
    .filter((s) => s.courseId === courseId && s.id !== exceptId && /^\d+$/.test(s.roll))
    .map((s) => Number(s.roll));
  return rolls.length ? String(Math.max(...rolls) + 1) : "101";
}

function StudentForm({
  student,
  students,
  courses,
  masked,
  onSaved,
}: {
  student: Student | null;
  students: Student[];
  courses: OfficeCourse[];
  masked: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations("office.students");
  const tOffice = useTranslations("office");
  const errorText = useErrorText();
  // Masked phones are display-only; sending them back would overwrite the real numbers.
  const phonesLocked = masked && student !== null;
  const [values, setValues] = useState({
    name: student?.name ?? "",
    roll: student?.roll ?? "",
    courseId: student?.courseId || courses[0]?.id || "",
    batchId: student?.batchId || courses[0]?.batches[0]?.id || "",
    studentPhone: student?.studentPhone ?? "",
    guardianPhone: student?.guardianPhone ?? "",
    joined: student?.joined || dhakaDateKey(new Date()),
    status: (student?.status ?? "Active") as StudentStatus,
    notes: student?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, OfficeErrorKey>>({});
  const [formError, setFormError] = useState<OfficeErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  const course = courses.find((c) => c.id === values.courseId);
  const set = (field: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));
  const suggestion = nextRoll(students, values.courseId, student?.id);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    const { studentPhone, guardianPhone, ...rest } = values;
    const res = await saveOfficeStudent({
      ...rest,
      id: student?.id ?? "",
      ...(phonesLocked ? {} : { studentPhone, guardianPhone }),
    }).catch(() => ({ ok: false as const, error: "generic" as const, fields: undefined }));
    setBusy(false);
    if (res.ok) return onSaved();
    setErrors(res.fields ?? {});
    setFormError(unshownError(res, ["name", "roll", "courseId", "batchId", "studentPhone", "guardianPhone", "joined", "notes"]));
  }

  const field = (name: string) =>
    errors[name] ? (
      <span id={`student-${name}-error`} className="text-sm font-normal text-red-800">
        {errorText(errors[name])}
      </span>
    ) : null;
  const describedBy = (name: string) => (errors[name] ? `student-${name}-error` : undefined);

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <label className={labelClass}>
        {t("name")}
        <input
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          required
          maxLength={60}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className={inputClass}
        />
        {field("name")}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {t("course")}
          <select
            value={values.courseId}
            onChange={(e) => {
              const next = courses.find((c) => c.id === e.target.value);
              setValues((v) => ({ ...v, courseId: e.target.value, batchId: next?.batches[0]?.id ?? "" }));
            }}
            className={inputClass}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {field("courseId")}
        </label>
        <label className={labelClass}>
          {t("batch")}
          <select value={values.batchId} onChange={(e) => set("batchId")(e.target.value)} className={inputClass}>
            {course?.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          {field("batchId")}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={labelClass}>
          <label htmlFor="student-roll">{t("roll")}</label>
          <input
            id="student-roll"
            value={values.roll}
            onChange={(e) => set("roll")(e.target.value)}
            maxLength={12}
            inputMode="numeric"
            aria-invalid={Boolean(errors.roll)}
            aria-describedby={describedBy("roll")}
            className={inputClass}
          />
          {field("roll")}
          {values.roll !== suggestion && (
            <button
              type="button"
              onClick={() => set("roll")(suggestion)}
              className="self-start text-sm font-medium text-brand underline-offset-2 hover:underline"
            >
              {t("useRoll", { roll: suggestion })}
            </button>
          )}
        </div>
        <label className={labelClass}>
          {t("joined")}
          <input
            type="date"
            value={values.joined}
            onChange={(e) => set("joined")(e.target.value)}
            required
            aria-invalid={Boolean(errors.joined)}
            aria-describedby={describedBy("joined")}
            className={inputClass}
          />
          {field("joined")}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {t("guardianPhone")}
          <input
            type="tel"
            value={values.guardianPhone}
            onChange={(e) => set("guardianPhone")(e.target.value)}
            disabled={phonesLocked}
            required
            autoComplete="off"
            aria-invalid={Boolean(errors.guardianPhone)}
            aria-describedby={describedBy("guardianPhone")}
            className={inputClass}
          />
          {field("guardianPhone")}
        </label>
        <label className={labelClass}>
          {t("studentPhone")}
          <input
            type="tel"
            value={values.studentPhone}
            onChange={(e) => set("studentPhone")(e.target.value)}
            disabled={phonesLocked}
            autoComplete="off"
            aria-invalid={Boolean(errors.studentPhone)}
            aria-describedby={describedBy("studentPhone")}
            className={inputClass}
          />
          {field("studentPhone")}
        </label>
      </div>
      {phonesLocked && <p className="text-sm text-muted">{t("phonesMasked")}</p>}

      <fieldset>
        <legend className="text-sm font-medium text-ink">{t("status")}</legend>
        <div className="mt-1.5 flex gap-2">
          {studentStatuses.map((s) => (
            <label key={s} className={`${chip(values.status === s)} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent`}>
              <input type="radio" name="status" value={s} checked={values.status === s} onChange={() => set("status")(s)} className="sr-only" />
              {t(`statuses.${s}`)}
            </label>
          ))}
        </div>
        {values.status === "Left" && <p className="mt-2 text-sm text-muted">{t("leftHint")}</p>}
      </fieldset>

      <label className={labelClass}>
        {t("notes")}
        <textarea
          value={values.notes}
          onChange={(e) => set("notes")(e.target.value)}
          rows={2}
          maxLength={300}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy("notes")}
          className={inputClass}
        />
        {field("notes")}
      </label>

      <div aria-live="polite">{formError && <ErrorNote>{errorText(formError)}</ErrorNote>}</div>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? tOffice("saving") : tOffice("save")}
        </button>
      </div>
    </form>
  );
}
