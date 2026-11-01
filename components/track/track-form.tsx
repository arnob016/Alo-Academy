"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import type { CourseNames } from "@/content/courses";
import { getTrackingSample, trackAdmission, type TrackedApplication } from "@/lib/actions";
import { useNow } from "@/lib/use-now";
import type { ErrorKey, TrackField } from "@/lib/validation";
import { describedBy, Field, inputClass } from "../forms/field";
import { btnPrimary, card } from "../ui";

export type Center = { name: string; address: string; phone: string };
type Props = { courses: CourseNames; demo: boolean; center: Center };

export function TrackFormFromUrl(props: Props) {
  const ref = useSearchParams().get("ref") ?? "";
  return <TrackForm {...props} initialRef={ref} />;
}

export function TrackForm({ courses, demo, center, initialRef = "" }: Props & { initialRef?: string }) {
  const t = useTranslations("track");
  const tErrors = useTranslations("errors");
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ ref: initialRef, phone: "" });
  const [errors, setErrors] = useState<Partial<Record<TrackField, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [result, setResult] = useState<TrackedApplication | null>(null);
  const [pending, startTransition] = useTransition();

  function lookup(next: { ref: string; phone: string }) {
    const data = new FormData();
    data.set("ref", next.ref);
    data.set("phone", next.phone);
    startTransition(async () => {
      // A dropped connection rejects the call; show it as a form error, not a crashed page.
      const res = await trackAdmission(data).catch(() => ({ ok: false as const, fieldErrors: undefined, formError: "generic" as const }));
      if (res.ok) {
        setResult(res.application);
        setErrors({});
        setFormError(null);
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.formError ?? null);
      const firstInvalid = Object.keys(res.fieldErrors ?? {})[0];
      if (firstInvalid) formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    lookup(values);
  }

  function trySample() {
    startTransition(async () => {
      const sample = await getTrackingSample().catch(() => null);
      if (!sample) return;
      setValues(sample);
      lookup(sample);
    });
  }

  const update = (field: TrackField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (result) {
    return (
      <TrackResult
        application={result}
        courses={courses}
        center={center}
        onReset={() => {
          setResult(null);
          setValues({ ref: "", phone: "" });
        }}
      />
    );
  }

  const input = (name: TrackField, hint?: string) => ({
    id: `track-${name}`,
    name,
    value: values[name],
    onChange: (e: { target: { value: string } }) => update(name, e.target.value),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`track-${name}`, hint, errors[name]),
    className: inputClass,
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className={`${card} space-y-5 p-6 sm:p-8`}>
      <Field id="track-ref" label={t("ref")} hint={t("refHint")} error={errors.ref && tErrors(errors.ref)}>
        <input
          {...input("ref", t("refHint"))}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="ALO-261029-AB12"
          className={`${inputClass} font-mono uppercase tracking-wider`}
        />
      </Field>
      <Field id="track-phone" label={t("phone")} error={errors.phone && tErrors(errors.phone)}>
        <input {...input("phone")} type="tel" inputMode="tel" autoComplete="tel" autoFocus={Boolean(initialRef)} placeholder="017XXXXXXXX" />
      </Field>

      <div aria-live="polite">
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
            {tErrors(formError)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={`${btnPrimary} disabled:opacity-60`}>
          {pending ? t("checking") : t("submit")}
        </button>
        {demo && (
          <button
            type="button"
            onClick={trySample}
            disabled={pending}
            className="rounded-md border-2 border-dashed border-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
          >
            {t("sample")}
          </button>
        )}
      </div>
    </form>
  );
}

type StepState = "done" | "current" | "failed" | "waiting";

/** Status timeline (and receipt, once confirmed) for one application. Also used on the account page. */
export function TrackResult({
  application: a,
  courses,
  center,
  onReset,
}: {
  application: TrackedApplication;
  courses: CourseNames;
  center: Center;
  /** Shows "Check another application" when given. */
  onReset?: () => void;
}) {
  const t = useTranslations("track");
  const format = useFormatter();
  const course = courses[a.courseId];
  const courseName = course?.name ?? a.courseName;
  const batchName = course?.batches[a.batchId] ?? a.batchName;
  const approved = a.status === "Approved";

  const steps: { key: string; title: string; text: string; state: StepState }[] = [
    {
      key: "received",
      title: t("steps.received.title"),
      text: t("steps.received.done", { date: format.dateTime(new Date(a.submittedAt), { dateStyle: "medium", timeStyle: "short" }) }),
      state: "done",
    },
    {
      key: "payment",
      title: t("steps.payment.title"),
      text: t(`steps.payment.${a.status}`, { phone: center.phone }),
      state: approved ? "done" : a.status === "Rejected" ? "failed" : "current",
    },
    {
      key: "seat",
      title: t("steps.seat.title"),
      text: approved ? t("steps.seat.done", { batch: batchName }) : t("steps.seat.waiting"),
      state: approved ? "done" : "waiting",
    },
    {
      key: "firstClass",
      title: t("steps.firstClass.title"),
      text:
        approved && a.firstClass
          ? t("steps.firstClass.done", {
              date: format.dateTime(new Date(a.firstClass), {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "numeric",
                minute: "2-digit",
              }),
            })
          : t("steps.firstClass.waiting"),
      state: approved && a.firstClass ? "done" : "waiting",
    },
  ];

  const badge = {
    Pending: "bg-accent/25 text-ink",
    Approved: "bg-emerald-100 text-emerald-900",
    Rejected: "bg-red-100 text-red-900",
  }[a.status];

  return (
    <section aria-labelledby="track-result" className={`${card} p-6 sm:p-8`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="track-result" className="font-mono text-xl font-bold tracking-wider text-brand">
          {a.ref}
        </h2>
        <p className={`rounded-full px-3 py-1 text-sm font-semibold ${badge}`}>{t(`badge.${a.status}`)}</p>
      </div>

      <dl className="mt-5 grid gap-4 rounded-lg bg-surface p-4 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">{t("student")}</dt>
          <dd className="font-semibold text-ink">{a.studentName}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("course")}</dt>
          <dd className="font-semibold text-ink">{courseName}</dd>
          <dd className="text-sm text-muted">{batchName}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("payment")}</dt>
          <dd className="font-semibold text-ink">
            {t("paid", { method: a.method === "bkash" ? "bKash" : a.method, amount: a.amount })}
          </dd>
        </div>
      </dl>

      <ol className="mt-8">
        {steps.map((step, i) => (
          <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-8 bottom-0 left-[15px] w-0.5 ${step.state === "done" ? "bg-brand" : "bg-ink/15"}`}
              />
            )}
            <StepIcon state={step.state} />
            <div className="pt-1">
              <p className={`font-semibold ${step.state === "waiting" ? "text-muted" : "text-ink"}`}>{step.title}</p>
              <p className={`mt-0.5 text-sm ${step.state === "failed" ? "text-red-800" : "text-muted"}`}>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {approved && (
        <Receipt application={a} courseName={courseName} batchName={batchName} center={center} />
      )}

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-8 font-semibold text-brand underline-offset-4 hover:underline print:hidden"
        >
          ← {t("another")}
        </button>
      )}
    </section>
  );
}

/** A money receipt for a confirmed admission. Printing shows only this (see `.receipt` in globals.css). */
function Receipt({
  application: a,
  courseName,
  batchName,
  center,
}: {
  application: TrackedApplication;
  courseName: string;
  batchName: string;
  center: Center;
}) {
  const t = useTranslations("track.receipt");
  const format = useFormatter();
  const now = useNow(60_000);
  const rows = [
    [t("received"), a.studentName],
    [t("for"), `${t("admissionFee")} — ${courseName}, ${batchName}`],
    [t("paidBy"), a.method === "bkash" ? "bKash" : a.method],
  ];

  return (
    <section aria-labelledby="receipt-title" className="mt-10">
      <div className="receipt rounded-lg border-2 border-dashed border-brand/30 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand/15 pb-4">
          <div>
            <p className="text-lg font-semibold text-brand">{center.name}</p>
            <p className="text-sm text-muted">{center.address}</p>
            <p className="text-sm text-muted">{center.phone}</p>
          </div>
          <div className="text-right">
            <h3 id="receipt-title" className="font-semibold tracking-wide text-ink uppercase">
              {t("title")}
            </h3>
            <p className="text-sm text-muted">
              {t("no")} <span className="font-mono font-semibold text-ink">{a.ref}</span>
            </p>
            <p className="text-sm text-muted">
              {t("issued")} {now !== null && format.dateTime(new Date(now), { dateStyle: "medium" })}
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
            <dt className="font-semibold text-ink">{t("total")}</dt>
            <dd className="text-xl font-bold text-brand tabular-nums">৳{format.number(a.amount)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{t("note")}</p>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-brand/30 px-4 py-2 font-semibold text-brand hover:bg-brand hover:text-white print:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
        </svg>
        {t("print")}
      </button>
    </section>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const base = "relative grid size-8 shrink-0 place-items-center rounded-full";
  if (state === "done") {
    return (
      <span className={`${base} bg-brand text-white`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className={`${base} bg-red-700 text-white`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className={`${base} border-2 border-accent bg-white`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:hidden" />
        <span className="size-2.5 rounded-full bg-accent" />
      </span>
    );
  }
  return <span className={`${base} border-2 border-ink/20 bg-white`} />;
}
