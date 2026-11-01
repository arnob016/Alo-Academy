"use client";

import { useState, type FormEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { OfficeCourse } from "@/content/courses";
import type { FeePayment } from "@/lib/fees";
import { listOfficeFees, recordOfficePayment, voidOfficePayment, type FeesResult } from "@/lib/office-actions";
import { feeMethods, type FeeMethod } from "@/lib/office-constants";
import type { OfficeErrorKey } from "@/lib/office-validation";
import { addMonths, dhakaMonthKey, monthRange } from "@/lib/schedule";
import type { Student } from "@/lib/students";
import { card } from "../ui";
import {
  btnDanger,
  btnOutline,
  btnPrimary,
  btnSmall,
  chip,
  downloadCsv,
  englishDigits,
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
import { useCourseLabels } from "./students-office";

type Data = Extract<FeesResult, { ok: true }>;
type Center = { name: string; address: string; phone: string };
const filters = ["all", "due", "paid"] as const;
/** How far ahead fees can be paid in advance. */
const ADVANCE_MONTHS = 6;

/** A student's fee position, worked out from their course, join date and payments. */
function feeLedger(student: Student, course: OfficeCourse | undefined, paid: Map<string, FeePayment>, current: string) {
  if (!course || !student.joined) return { start: "", end: "", due: [] as string[], payable: [] as string[] };
  const start = student.joined.slice(0, 7);
  const end = addMonths(start, Math.max(1, course.durationMonths) - 1);
  const billable = monthRange(start, current < end ? current : end);
  const due = billable.filter((m) => !paid.has(m));
  // Arrears first, then advance months up to the end of the course.
  const ahead = monthRange(addMonths(current, 1), addMonths(current, ADVANCE_MONTHS) < end ? addMonths(current, ADVANCE_MONTHS) : end);
  return { start, end, due, payable: [...due, ...ahead.filter((m) => !paid.has(m))] };
}

export function FeesOffice({ courses, center }: { courses: OfficeCourse[]; center: Center }) {
  const { state, reload, reloadError } = useOfficeData(listOfficeFees);
  return (
    <OfficeState state={state}>
      {(data) => <FeesView data={data} courses={courses} center={center} reload={reload} reloadError={reloadError} />}
    </OfficeState>
  );
}

function FeesView({
  data,
  courses,
  center,
  reload,
  reloadError,
}: {
  data: Data;
  courses: OfficeCourse[];
  center: Center;
  reload: () => Promise<void>;
  reloadError: boolean;
}) {
  const t = useTranslations("office.fees");
  const tOffice = useTranslations("office");
  const format = useFormatter();
  const labels = useCourseLabels(courses);
  const [current] = useState(() => dhakaMonthKey(new Date()));
  const [month, setMonth] = useState(current);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<Student | null>(null);
  const [history, setHistory] = useState<Student | null>(null);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<OfficeErrorKey | null>(null);
  const errorText = useErrorText();

  const monthName = (m: string) => format.dateTime(new Date(`${m}-01T12:00:00+06:00`), { month: "long", year: "numeric" });
  const money = (n: number) => `৳${format.number(n)}`;
  const courseOf = (s: Student) => courses.find((c) => c.id === s.courseId);

  // Month → its (non-void) payment, per student.
  const paidBy = new Map<string, Map<string, FeePayment>>();
  for (const p of data.payments) {
    if (p.status !== "Paid") continue;
    const months = paidBy.get(p.studentId) ?? new Map<string, FeePayment>();
    for (const m of p.months) months.set(m, p);
    paidBy.set(p.studentId, months);
  }
  const paidOf = (s: Student) => paidBy.get(s.id) ?? new Map<string, FeePayment>();

  const active = data.students.filter((s) => s.status === "Active");
  const rows = active.map((s) => {
    const course = courseOf(s);
    const paid = paidOf(s);
    const ledger = feeLedger(s, course, paid, current);
    const payment = paid.get(month);
    const state = payment
      ? "paid"
      : !ledger.start
        ? "unknown"
        : month < ledger.start
          ? "notJoined"
          : month > ledger.end
            ? "finished"
            : month > current
              ? "notDue"
              : "due";
    return { student: s, course, ledger, payment, state } as const;
  });

  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const visible = rows.filter(
    (r) =>
      (courseFilter === "all" || r.student.courseId === courseFilter) &&
      (filter === "all" || (filter === "due" ? r.state === "due" : r.state === "paid")) &&
      (!needle ||
        r.student.name.toLowerCase().replace(/\s+/g, "").includes(needle) ||
        r.student.roll.toLowerCase().includes(needle)),
  );

  const enrolledThisMonth = rows.filter((r) => r.state === "paid" || r.state === "due" || r.state === "notDue");
  const paidThisMonth = rows.filter((r) => r.state === "paid");
  const dueThisMonth = rows.filter((r) => r.state === "due");
  const received = data.payments
    .filter((p) => p.status === "Paid" && dhakaMonthKey(new Date(p.paidAt)) === month)
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = rows.reduce((sum, r) => sum + r.ledger.due.length * (r.course?.monthlyFee ?? 0), 0);

  const kpis = [
    { key: "received", value: money(received) },
    { key: "paidCount", value: t("paidOf", { paid: paidThisMonth.length, total: enrolledThisMonth.length }) },
    { key: "dueCount", value: format.number(dueThisMonth.length), highlight: dueThisMonth.length > 0 },
    { key: "outstanding", value: money(outstanding) },
  ] as const;

  async function voidReceipt(p: FeePayment) {
    if (!window.confirm(t("voidConfirm", { receipt: p.receipt, name: p.studentName }))) return;
    setVoiding(p.receipt);
    setVoidError(null);
    const res = await voidOfficePayment(p.receipt).catch(() => ({ ok: false as const, error: "generic" as const }));
    setVoiding(null);
    if (!res.ok) return setVoidError(res.error);
    if (receipt?.receipt === p.receipt) setReceipt({ ...p, status: "Void" });
    await reload();
  }

  function exportCsv() {
    downloadCsv(`fees-${month}.csv`, [
      ["Roll", "Name", "Course", "Batch", "Guardian phone", monthName(month), "Receipt", "Months owed", "Amount owed"],
      ...visible.map((r) => [
        r.student.roll,
        r.student.name,
        labels.course(r.student),
        labels.batch(r.student),
        r.student.guardianPhone,
        t(`states.${r.state}`),
        r.payment?.receipt ?? "",
        r.ledger.due.length,
        r.ledger.due.length * (r.course?.monthlyFee ?? 0),
      ]),
    ]);
  }

  const studentPayments = (s: Student) => data.payments.filter((p) => p.studentId === s.id);

  return (
    <div className="space-y-8">
      <SourceBar source={data.source} onRefresh={() => void reload()} reloadError={reloadError}>
        <button type="button" onClick={exportCsv} disabled={!visible.length} className={btnOutline}>
          {tOffice("export")}
        </button>
      </SourceBar>

      {receipt && (
        <FeeReceipt
          payment={receipt}
          student={data.students.find((s) => s.id === receipt.studentId)}
          center={center}
          labels={labels}
          monthName={monthName}
          onClose={() => setReceipt(null)}
        />
      )}

      <div aria-live="polite">{voidError && <ErrorNote>{errorText(voidError)}</ErrorNote>}</div>

      <div className="flex flex-wrap items-end gap-4">
        <label className={labelClass}>
          {t("month")}
          <input
            type="month"
            value={month}
            onChange={(e) => /^\d{4}-\d{2}$/.test(e.target.value) && setMonth(e.target.value)}
            className={`${inputClass} w-48`}
          />
        </label>
        {month !== current && (
          <button type="button" onClick={() => setMonth(current)} className={`${btnOutline} mb-1`}>
            {t("thisMonth")}
          </button>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.key} className={`${card} flex flex-col p-5 ${"highlight" in kpi && kpi.highlight ? "ring-2 ring-accent" : ""}`}>
            <dt className="text-sm text-muted">{t(`kpi.${kpi.key}`, { month: monthName(month) })}</dt>
            <dd className="order-first text-2xl font-semibold text-brand tabular-nums sm:text-3xl">{kpi.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 xl:grid-cols-[1fr_18rem] xl:items-start">
        <section aria-labelledby="fee-list" className="min-w-0 space-y-4">
          <h2 id="fee-list" className="text-lg font-semibold text-brand">
            {t("listTitle", { month: monthName(month) })}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div role="group" aria-label={tOffice("filter")} className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chip(filter === f)}>
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                aria-label={t("course")}
                className={`${inputClass} sm:w-52`}
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
                className={`${inputClass} sm:w-56`}
              />
            </div>
          </div>

          <div className={`${card} relative overflow-x-auto`}>
            {visible.length === 0 ? (
              <p className="p-6 text-muted">{t("empty")}</p>
            ) : (
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
                    <th scope="col" className="px-5 py-2 font-semibold">{t("student")}</th>
                    <th scope="col" className="py-2 font-semibold">{monthName(month)}</th>
                    <th scope="col" className="py-2 font-semibold">{t("owed")}</th>
                    <th scope="col" className="px-5 py-2 text-right font-semibold">
                      <span className="sr-only">{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/10">
                  {visible.map(({ student: s, course, ledger, payment, state }) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3">
                        <p className="flex flex-wrap items-center gap-2">
                          {s.roll && <span className="font-semibold text-brand tabular-nums">{s.roll}</span>}
                          <span className="font-medium text-ink">{s.name}</span>
                          {s.sample && <SampleBadge />}
                        </p>
                        <p className="text-xs text-muted">
                          {labels.course(s)} · {labels.batch(s)}
                        </p>
                      </td>
                      <td className="py-3">
                        {payment ? (
                          <button
                            type="button"
                            onClick={() => setReceipt(payment)}
                            className="rounded-md bg-emerald-100 px-2.5 py-1 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-200"
                            title={t("showReceipt")}
                          >
                            ✓ {t("states.paid")}
                            <span className="block font-mono font-normal whitespace-nowrap">{payment.receipt}</span>
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                              state === "due" ? "bg-red-100 text-red-900" : "bg-ink/10 text-muted"
                            }`}
                          >
                            {t(`states.${state}`)}
                            {state === "due" && course && ` · ${money(course.monthlyFee)}`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 tabular-nums">
                        {ledger.due.length ? (
                          <span className="font-semibold text-red-800">
                            {t("owedMonths", { count: ledger.due.length, amount: ledger.due.length * (course?.monthlyFee ?? 0) })}
                          </span>
                        ) : (
                          <span className="text-muted">{t("upToDate")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex justify-end gap-2 whitespace-nowrap">
                          <button type="button" onClick={() => setHistory(s)} className={btnOutline}>
                            {t("history")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaying(s)}
                            disabled={!course || ledger.payable.length === 0}
                            className={btnSmall}
                          >
                            {t("record")}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section aria-labelledby="recent-payments" className={`${card} p-5`}>
          <h2 id="recent-payments" className="font-semibold text-brand">
            {t("recent")}
          </h2>
          {data.payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noPayments")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.payments.slice(0, 12).map((p) => (
                <li key={p.receipt} className="text-sm">
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={`font-medium ${p.status === "Void" ? "text-muted line-through" : "text-ink"}`}>{p.studentName}</span>
                    <span className="font-semibold text-ink tabular-nums">{money(p.amount)}</span>
                  </p>
                  <p className="text-muted">
                    {p.months.map(monthName).join(", ")} · {t(`methods.${p.method}`)}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <button type="button" onClick={() => setReceipt(p)} className="font-mono underline-offset-2 hover:text-brand hover:underline">
                      {p.receipt}
                    </button>
                    {p.status === "Void" && <span className="font-semibold text-red-800">{t("void")}</span>}
                    {p.sample && <SampleBadge />}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={paying !== null} title={t("recordTitle")} onClose={() => setPaying(null)}>
        {paying && (
          <PaymentForm
            key={paying.id}
            student={paying}
            course={courseOf(paying)!}
            payable={feeLedger(paying, courseOf(paying), paidOf(paying), current).payable}
            defaultMonth={month}
            monthName={monthName}
            onSaved={(payment) => {
              setPaying(null);
              setReceipt(payment);
              void reload();
            }}
          />
        )}
      </Modal>

      <Modal open={history !== null} title={history ? t("historyTitle", { name: history.name }) : ""} onClose={() => setHistory(null)} wide>
        {history &&
          (studentPayments(history).length === 0 ? (
            <p className="text-muted">{t("noPayments")}</p>
          ) : (
            <ul className="divide-y divide-brand/10">
              {studentPayments(history).map((p) => (
                <li key={p.receipt} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className={`font-medium ${p.status === "Void" ? "text-muted line-through" : "text-ink"}`}>
                      {p.months.map(monthName).join(", ")} · {money(p.amount)}
                    </p>
                    <p className="text-muted">
                      <span className="font-mono">{p.receipt}</span> ·{" "}
                      {format.dateTime(new Date(p.paidAt), { dateStyle: "medium", timeStyle: "short" })} · {t(`methods.${p.method}`)}
                      {p.recordedBy && ` · ${p.recordedBy}`}
                    </p>
                    {p.note && <p className="text-muted">{p.note}</p>}
                  </div>
                  <span className="flex gap-2">
                    {p.status === "Void" ? (
                      <span className="text-xs font-semibold text-red-800">{t("void")}</span>
                    ) : (
                      <button type="button" onClick={() => void voidReceipt(p)} disabled={voiding === p.receipt} className={btnDanger}>
                        {t("voidAction")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setHistory(null);
                        setReceipt(p);
                      }}
                      className={btnOutline}
                    >
                      {t("showReceipt")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </Modal>
    </div>
  );
}

function PaymentForm({
  student,
  course,
  payable,
  defaultMonth,
  monthName,
  onSaved,
}: {
  student: Student;
  course: OfficeCourse;
  payable: string[];
  defaultMonth: string;
  monthName: (m: string) => string;
  onSaved: (payment: FeePayment) => void;
}) {
  const t = useTranslations("office.fees");
  const tOffice = useTranslations("office");
  const errorText = useErrorText();
  const [months, setMonths] = useState<string[]>(() => [payable.includes(defaultMonth) ? defaultMonth : payable[0]].filter(Boolean));
  const [amount, setAmount] = useState(() => String(months.length * course.monthlyFee));
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState<FeeMethod>("cash");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, OfficeErrorKey>>({});
  const [formError, setFormError] = useState<OfficeErrorKey | null>(null);
  const [busy, setBusy] = useState(false);

  function toggle(m: string) {
    const next = months.includes(m) ? months.filter((x) => x !== m) : [...months, m].sort();
    setMonths(next);
    // Until staff type their own amount (a discount, say), keep it at the standard fee.
    if (!amountTouched) setAmount(String(next.length * course.monthlyFee));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await recordOfficePayment({ studentId: student.id, months, amount: englishDigits(amount), method, note }).catch(() => ({
      ok: false as const,
      error: "generic" as const,
      fields: undefined,
    }));
    setBusy(false);
    if (res.ok) return onSaved(res.payment);
    setErrors(res.fields ?? {});
    setFormError(unshownError(res, ["months", "amount", "note"]));
  }

  const standard = months.length * course.monthlyFee;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <p className="rounded-md bg-surface p-3 text-sm">
        <span className="font-semibold text-ink">{student.name}</span>
        {student.roll && <span className="text-muted"> · {t("rollNo", { roll: student.roll })}</span>}
        <br />
        <span className="text-muted">
          {course.name} · {t("perMonth", { amount: course.monthlyFee })}
        </span>
      </p>

      <fieldset aria-describedby={errors.months ? "fee-months-error" : undefined}>
        <legend className="text-sm font-medium text-ink">{t("months")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {payable.map((m) => (
            <label key={m} className={`${chip(months.includes(m))} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent`}>
              <input type="checkbox" checked={months.includes(m)} onChange={() => toggle(m)} className="sr-only" />
              {monthName(m)}
            </label>
          ))}
        </div>
        {errors.months && (
          <p id="fee-months-error" className="mt-2 text-sm text-red-800">
            {errorText(errors.months)}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {t("amount")}
          <input
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountTouched(true);
            }}
            inputMode="numeric"
            required
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "fee-amount-error" : "fee-amount-hint"}
            className={`${inputClass} tabular-nums`}
          />
          {errors.amount ? (
            <span id="fee-amount-error" className="text-sm font-normal text-red-800">
              {errorText(errors.amount)}
            </span>
          ) : (
            <span id="fee-amount-hint" className="text-sm font-normal text-muted">
              {t("standard", { amount: standard })}
            </span>
          )}
        </label>
        <label className={labelClass}>
          {t("method")}
          <select value={method} onChange={(e) => setMethod(e.target.value as FeeMethod)} className={inputClass}>
            {feeMethods.map((m) => (
              <option key={m} value={m}>
                {t(`methods.${m}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        {t("note")}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder={t("notePlaceholder")}
          aria-invalid={Boolean(errors.note)}
          className={inputClass}
        />
        {errors.note && <span className="text-sm font-normal text-red-800">{errorText(errors.note)}</span>}
      </label>

      <div aria-live="polite">{formError && <ErrorNote>{errorText(formError)}</ErrorNote>}</div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {months.length > 0 && t("summary", { count: months.length, amount: Number(englishDigits(amount)) || 0 })}
        </p>
        <button type="submit" disabled={busy || months.length === 0} className={btnPrimary}>
          {busy ? tOffice("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}

/** A printable money receipt. Printing shows only this (see `.receipt` in globals.css). */
function FeeReceipt({
  payment: p,
  student,
  center,
  labels,
  monthName,
  onClose,
}: {
  payment: FeePayment;
  student: Student | undefined;
  center: Center;
  labels: ReturnType<typeof useCourseLabels>;
  monthName: (m: string) => string;
  onClose: () => void;
}) {
  const t = useTranslations("office.fees");
  const tReceipt = useTranslations("office.fees.receipt");
  const format = useFormatter();
  const rows = [
    [tReceipt("received"), `${p.studentName}${student?.roll ? ` (${t("rollNo", { roll: student.roll })})` : ""}`],
    [tReceipt("course"), `${labels.course(p)} · ${labels.batch(p)}`],
    [tReceipt("for"), p.months.map(monthName).join(", ")],
    [tReceipt("paidBy"), t(`methods.${p.method}`)],
    ...(p.note ? [[tReceipt("note"), p.note]] : []),
    ...(p.recordedBy ? [[tReceipt("recordedBy"), p.recordedBy]] : []),
  ];

  return (
    <section aria-labelledby="fee-receipt-title" className={`${card} p-5`}>
      <div className="receipt relative rounded-lg border-2 border-dashed border-brand/30 bg-white p-6">
        {p.status === "Void" && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center text-6xl font-black tracking-widest text-red-700/25 uppercase"
          >
            {t("void")}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand/15 pb-4">
          <div>
            <p className="text-lg font-semibold text-brand">{center.name}</p>
            <p className="text-sm text-muted">{center.address}</p>
            <p className="text-sm text-muted">{center.phone}</p>
          </div>
          <div className="text-right">
            <h2 id="fee-receipt-title" className="font-semibold tracking-wide text-ink uppercase">
              {tReceipt("title")}
            </h2>
            <p className="text-sm text-muted">
              {tReceipt("no")} <span className="font-mono font-semibold text-ink">{p.receipt}</span>
            </p>
            <p className="text-sm text-muted">
              {tReceipt("date")} {format.dateTime(new Date(p.paidAt), { dateStyle: "medium" })}
            </p>
          </div>
        </div>
        <dl className="divide-y divide-brand/10">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-medium text-ink">{value}</dd>
            </div>
          ))}
          <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
            <dt className="font-semibold text-ink">{tReceipt("total")}</dt>
            <dd className="text-xl font-bold text-brand tabular-nums">৳{format.number(p.amount)}</dd>
          </div>
        </dl>
        {p.status === "Void" && <p className="mt-3 text-sm font-semibold text-red-800">{tReceipt("voided")}</p>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} disabled={p.status === "Void"} className={btnPrimary}>
          {tReceipt("print")}
        </button>
        <button type="button" onClick={onClose} className={btnOutline}>
          {tReceipt("close")}
        </button>
      </div>
    </section>
  );
}
