"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { CourseNames } from "@/content/courses";
import {
  listOfficeAdmissions,
  listOfficeTrials,
  updateAdmissionStatus,
  type OfficeAdmission,
  type OfficeTrial,
} from "@/lib/actions";
import type { AdmissionStatus } from "@/lib/admissions";
import { nextClassStart, type Slot } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { card } from "../ui";
import { downloadCsv } from "./office-ui";

const POLL_MS = 10_000;
const filters = ["all", "Pending", "Approved", "Rejected"] as const;
type Filter = (typeof filters)[number];

const statusPill: Record<AdmissionStatus, string> = {
  Pending: "bg-accent/25 text-ink",
  Approved: "bg-emerald-100 text-emerald-900",
  Rejected: "bg-red-100 text-red-900",
};

export function OfficeDashboard({
  courses,
  slots,
  center,
}: {
  courses: CourseNames;
  /** Batch schedules keyed "courseId:batchId", for the first-class date in SMS. */
  slots: Record<string, Slot>;
  center: { name: string; phone: string };
}) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow(30_000);

  const [rows, setRows] = useState<OfficeAdmission[] | null>(null);
  const [source, setSource] = useState<"sheet" | "memory" | null>(null);
  const [loadError, setLoadError] = useState<"generic" | "unauthorized" | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [trials, setTrials] = useState<OfficeTrial[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const known = useRef<Set<string> | null>(null);
  // Status changes still being saved. A poll that was already in flight
  // returns the old status, so these win until the save settles.
  const saving = useRef(new Map<string, AdmissionStatus>());
  // Bumped when a save settles: a load that started before then may have read the old status.
  const savesSettled = useRef(0);

  const load = useCallback(async () => {
    const settledAtStart = savesSettled.current;
    // A dropped connection or a redeploy rejects the call; the next poll tries again.
    const res = await listOfficeAdmissions().catch(() => ({ ok: false as const, error: "generic" as const }));
    if (settledAtStart !== savesSettled.current) return;
    if (!res.ok) {
      setLoadError(res.error);
      return;
    }
    // Highlight rows that weren't there on the previous load.
    const previous = known.current;
    setFresh(previous ? new Set(res.admissions.filter((a) => !previous.has(a.ref)).map((a) => a.ref)) : new Set());
    known.current = new Set(res.admissions.map((a) => a.ref));
    setRows(res.admissions.map((a) => (saving.current.has(a.ref) ? { ...a, status: saving.current.get(a.ref)! } : a)));
    setSource(res.source);
    setLoadError(null);
    setUpdatedAt(Date.now());

    const trialRes = await listOfficeTrials().catch(() => ({ ok: false as const }));
    if (trialRes.ok) setTrials(trialRes.trials);
  }, []);

  // The "Copied" label on an SMS button fades after a moment.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copySms(r: OfficeAdmission) {
    if (r.status === "Pending") return;
    const slot = slots[`${r.courseId}:${r.batchId}`];
    const first = slot ? nextClassStart(slot) : null;
    const text = t(`sms.${r.status}`, {
      center: center.name,
      name: r.studentName,
      ref: r.ref,
      course: courseName(r),
      batch: batchName(r),
      date: first ? format.dateTime(first, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—",
      phone: center.phone,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(r.ref);
    } catch {
      // Clipboard blocked (insecure context or denied): nothing to copy into.
    }
  }

  // Poll while the tab is visible, and catch up as soon as it's shown again.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      void load();
      timer = setInterval(() => void load(), POLL_MS);
    };
    const onVisibility = () => (document.hidden ? clearInterval(timer) : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  async function changeStatus(ref: string, status: AdmissionStatus) {
    const before = rows?.find((r) => r.ref === ref)?.status;
    const setStatus = (s: AdmissionStatus) =>
      setRows((prev) => prev?.map((r) => (r.ref === ref ? { ...r, status: s } : r)) ?? prev);

    setUpdateError(null);
    setBusy((prev) => new Set(prev).add(ref));
    saving.current.set(ref, status);
    setStatus(status);
    const res = await updateAdmissionStatus(ref, status).catch(() => ({ ok: false }));
    saving.current.delete(ref);
    // A poll still in flight may have read the Sheet before this save; drop its answer.
    savesSettled.current++;
    if (res.ok) {
      setStatus(status);
    } else {
      if (before) setStatus(before);
      setUpdateError(ref);
    }
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(ref);
      return next;
    });
  }

  if (loadError === "unauthorized") {
    return (
      <div className={`${card} p-6`}>
        <p className="text-ink">{t("signInRequired")}</p>
        <Link
          href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard`)}`}
          className="mt-4 inline-flex rounded-md bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  const all = rows ?? [];
  const count = (s: AdmissionStatus) => all.filter((r) => r.status === s).length;
  const approved = all.filter((r) => r.status === "Approved");
  const kpis = [
    { key: "total", value: format.number(all.length) },
    { key: "pending", value: format.number(count("Pending")), highlight: count("Pending") > 0 },
    { key: "approved", value: format.number(approved.length) },
    { key: "collected", value: `৳${format.number(approved.reduce((sum, r) => sum + r.amount, 0))}` },
  ] as const;

  const courseName = (r: OfficeAdmission) => courses[r.courseId]?.name ?? r.courseName;
  const batchName = (r: OfficeAdmission) => courses[r.courseId]?.batches[r.batchId] ?? r.batchName;

  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  const visible = all.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!needle ||
        r.studentName.toLowerCase().replace(/\s+/g, "").includes(needle) ||
        r.ref.toLowerCase().includes(needle) ||
        r.phone.replace(/\*/g, "").includes(needle)),
  );

  const perCourse = Object.entries(
    all.reduce<Record<string, { total: number; approved: number; row: OfficeAdmission }>>((acc, r) => {
      const key = r.courseId || r.courseName;
      acc[key] ??= { total: 0, approved: 0, row: r };
      acc[key].total++;
      if (r.status === "Approved") acc[key].approved++;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total);
  const maxPerCourse = Math.max(1, ...perCourse.map(([, v]) => v.total));

  const when = (ms: number) =>
    now !== null && ms ? format.relativeTime(new Date(ms), new Date(Math.max(now, ms))) : "";
  const absolute = (ms: number) => (ms ? format.dateTime(new Date(ms), { dateStyle: "medium", timeStyle: "short" }) : "");

  function exportCsv() {
    const header = ["Submitted", "Ref No", "Student", "Course", "Batch", "Phone", "Method", "Amount", "TrxID", "Status"];
    const lines = visible.map((r) => [
      absolute(r.submittedAt),
      r.ref,
      r.studentName,
      courseName(r),
      batchName(r),
      r.phone,
      r.method,
      r.amount,
      r.trxId,
      t(`statuses.${r.status}`),
    ]);
    downloadCsv(`admissions-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines]);
  }

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-emerald-800">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-emerald-600" />
          </span>
          {t("live")}
        </span>
        {source && <span className="text-muted">{t(`source.${source}`)}</span>}
        <span aria-live="polite" className="text-muted">
          {updatedAt && t("updated", { time: format.dateTime(new Date(updatedAt), { timeStyle: "medium" }) })}
        </span>
        <span className="flex flex-1 justify-end gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-brand/30 px-3 py-1.5 font-semibold text-brand hover:bg-brand hover:text-white"
          >
            {t("refresh")}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!visible.length}
            className="rounded-md border border-brand/30 px-3 py-1.5 font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-50"
          >
            {t("export")}
          </button>
        </span>
      </div>

      {loadError === "generic" && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
          {t("loadError")}
        </p>
      )}

      {/* KPIs */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.key}
            className={`${card} flex flex-col p-5 ${"highlight" in kpi && kpi.highlight ? "ring-2 ring-accent" : ""}`}
          >
            <dt className="text-sm text-muted">{t(`kpi.${kpi.key}`)}</dt>
            <dd className="order-first text-3xl font-semibold text-brand tabular-nums">{rows ? kpi.value : "–"}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        {/* Inbox */}
        <section aria-labelledby="inbox" className="min-w-0 space-y-4">
          <h2 id="inbox" className="sr-only">
            {t("title")}
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="group" aria-label={t("filter")} className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                    filter === f ? "border-brand bg-brand text-white" : "border-brand/20 bg-white text-ink hover:border-brand/50"
                  }`}
                >
                  {t(`statuses.${f}`)}{" "}
                  <span className={filter === f ? "text-white/75" : "text-muted"}>
                    {format.number(f === "all" ? all.length : count(f))}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="w-full rounded-md border border-ink/25 bg-white px-3 py-2 sm:w-80"
            />
          </div>

          <div aria-live="polite">
            {updateError && (
              <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
                {t("updateError", { ref: updateError })}
              </p>
            )}
          </div>

          <div className={`${card} overflow-hidden`}>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[6.5rem_1.3fr_1.2fr_1.2fr_9.5rem] gap-4 border-b border-brand/10 bg-surface px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase xl:grid"
            >
              <span>{t("columns.submitted")}</span>
              <span>{t("columns.student")}</span>
              <span>{t("columns.course")}</span>
              <span>{t("columns.payment")}</span>
              <span>{t("columns.actions")}</span>
            </div>

            {rows === null ? (
              <p aria-busy="true" className="p-6 text-muted">
                {t("loading")}
              </p>
            ) : visible.length === 0 ? (
              <p className="p-6 text-muted">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-brand/10">
                {visible.map((r) => {
                  const feeOk = r.expectedFee === null || r.amount === r.expectedFee;
                  const isBusy = busy.has(r.ref);
                  return (
                    <li
                      key={r.ref}
                      className={`grid gap-x-4 gap-y-2 px-5 py-4 transition-colors duration-1000 xl:grid-cols-[6.5rem_1.3fr_1.2fr_1.2fr_9.5rem] xl:items-center ${
                        fresh.has(r.ref) ? "bg-accent/15" : ""
                      }`}
                    >
                      <p className="order-last text-sm text-muted xl:order-none" title={absolute(r.submittedAt)}>
                        {when(r.submittedAt) || absolute(r.submittedAt)}
                      </p>

                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{r.studentName}</span>
                          {fresh.has(r.ref) && (
                            <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-ink">{t("new")}</span>
                          )}
                          {r.sample && (
                            <span className="rounded border border-dashed border-zinc-400 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
                              {t("sample")}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted">
                          <Link
                            href={`/${locale}/track?ref=${encodeURIComponent(r.ref)}`}
                            title={t("trackLink")}
                            className="font-mono underline-offset-2 hover:text-brand hover:underline"
                          >
                            {r.ref}
                          </Link>{" "}
                          · <span className="tabular-nums">{r.phone}</span>
                        </p>
                      </div>

                      <div className="min-w-0 text-sm">
                        <p className="font-medium text-ink">{courseName(r)}</p>
                        <p className="text-muted">{batchName(r)}</p>
                      </div>

                      <div className="min-w-0 text-sm">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink tabular-nums">৳{format.number(r.amount)}</span>
                          <span className="text-muted">{r.method === "bkash" ? "bKash" : r.method}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                              feeOk ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                            }`}
                          >
                            {feeOk ? `✓ ${t("amountOk")}` : `⚠ ${t("amountOff", { amount: r.expectedFee ?? 0 })}`}
                          </span>
                        </p>
                        <p className="font-mono text-muted">TrxID {r.trxId}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === "Pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => changeStatus(r.ref, "Approved")}
                              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                            >
                              {t("approve")}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => changeStatus(r.ref, "Rejected")}
                              className="rounded-md border border-red-700/40 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60"
                            >
                              {t("reject")}
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill[r.status]}`}>
                              {t(`statuses.${r.status}`)}
                            </span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => changeStatus(r.ref, "Pending")}
                              className="text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-60"
                            >
                              {t("undo")}
                            </button>
                            <button
                              type="button"
                              onClick={() => copySms(r)}
                              className="rounded-md border border-brand/30 px-2 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white"
                            >
                              <span aria-live="polite">{copied === r.ref ? t("copied") : t("copySms")}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-8">
          {/* Upcoming trial classes */}
          <section aria-labelledby="trials" className={`${card} p-5`}>
            <h2 id="trials" className="font-semibold text-brand">
              {t("trialsTitle")}
            </h2>
            {trials === null ? (
              <p aria-busy="true" className="mt-3 text-sm text-muted">
                {t("loading")}
              </p>
            ) : trials.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t("trialsEmpty")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {trials.map((trial) => (
                  <li key={trial.ref} className="flex gap-3">
                    <time
                      dateTime={new Date(trial.classAt).toISOString()}
                      className="flex w-12 shrink-0 flex-col items-center rounded-md bg-surface py-1 text-center leading-tight"
                    >
                      <span className="font-semibold text-brand">{format.dateTime(new Date(trial.classAt), { day: "numeric" })}</span>
                      <span className="text-xs text-muted">{format.dateTime(new Date(trial.classAt), { month: "short" })}</span>
                    </time>
                    <div className="min-w-0 text-sm">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-ink">{trial.studentName}</span>
                        {trial.sample && (
                          <span className="rounded border border-dashed border-zinc-400 px-1 text-xs font-semibold text-zinc-600">
                            {t("sample")}
                          </span>
                        )}
                      </p>
                      <p className="text-muted">
                        {courses[trial.courseId]?.name ?? trial.courseName} ·{" "}
                        {courses[trial.courseId]?.batches[trial.batchId] ?? trial.batchName}
                      </p>
                      <p className="text-muted tabular-nums">
                        {format.dateTime(new Date(trial.classAt), { weekday: "short", hour: "numeric", minute: "2-digit" })} ·{" "}
                        {trial.phone}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Per-course breakdown */}
          <section aria-labelledby="by-course" className={`${card} p-5`}>
            <h2 id="by-course" className="font-semibold text-brand">
              {t("byCourse")}
            </h2>
            <ul className="mt-4 space-y-4">
              {perCourse.map(([key, v]) => (
                <li key={key}>
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{courseName(v.row)}</span>
                    <span className="shrink-0 font-semibold text-ink tabular-nums">{format.number(v.total)}</span>
                  </p>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand/10">
                    <div className="flex h-full" style={{ width: `${(v.total / maxPerCourse) * 100}%` }}>
                      <span className="h-full bg-brand" style={{ width: `${(v.approved / v.total) * 100}%` }} />
                      <span className="h-full flex-1 bg-brand/35" />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t("confirmedOf", { approved: v.approved, total: v.total })}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
