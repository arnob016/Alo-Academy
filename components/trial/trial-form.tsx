"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { Level } from "@/content/courses";
import { bookTrial } from "@/lib/actions";
import { batchCalendar, dhakaDateKey, TRIAL_WINDOW_DAYS, upcomingClasses, type Slot } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import type { ErrorKey, TrialField } from "@/lib/validation";
import { describedBy, Field, Honeypot, inputClass } from "../forms/field";
import { Turnstile } from "../forms/turnstile";
import { btnPrimary, btnSecondary, card } from "../ui";

export type TrialCourse = {
  id: string;
  level: Level;
  name: string;
  batches: { id: string; label: string; slot: Slot }[];
};

type Props = {
  courses: TrialCourse[];
  levels: readonly Level[];
  turnstileSiteKey: string;
  demo: boolean;
  location: string;
};

type Values = Record<TrialField, string>;
type Booking = { ref: string; classAt: number; courseId: string; batchId: string };

const MAX_DATES = 6;

function initialValues(courses: TrialCourse[], courseId?: string): Values {
  const course = courses.find((c) => c.id === courseId);
  return {
    courseId: course?.id ?? "",
    batchId: course?.batches.length === 1 ? course.batches[0].id : "",
    date: "",
    studentName: "",
    guardianPhone: "",
  };
}

export function TrialFormFromUrl(props: Props) {
  const courseId = useSearchParams().get("course") ?? undefined;
  return <TrialForm {...props} initialCourseId={courseId} />;
}

export function TrialForm({ courses, levels, turnstileSiteKey, demo, location, initialCourseId }: Props & { initialCourseId?: string }) {
  const t = useTranslations("trial");
  const tForm = useTranslations("form");
  const tErrors = useTranslations("errors");
  const tLevels = useTranslations("levels");
  const tDemo = useTranslations("demo");
  const format = useFormatter();
  const locale = useLocale();
  const now = useNow(60_000);
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState(() => initialValues(courses, initialCourseId));
  const [errors, setErrors] = useState<Partial<Record<TrialField, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [captchaActive, setCaptchaActive] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pending, startTransition] = useTransition();

  const course = courses.find((c) => c.id === values.courseId);
  const batch = course?.batches.find((b) => b.id === values.batchId);
  const dates =
    batch && now !== null
      ? upcomingClasses(batch.slot, MAX_DATES, new Date(now)).filter(
          (d) => d.getTime() <= now + TRIAL_WINDOW_DAYS * 86_400_000,
        )
      : [];
  const hasErrors = Object.values(errors).some(Boolean);

  function update(field: TrialField, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "courseId") {
        const selected = courses.find((c) => c.id === value);
        next.batchId = selected?.batches.length === 1 ? selected.batches[0].id : "";
        next.date = "";
      }
      if (field === "batchId") next.date = "";
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function fillSample() {
    const sampleCourse = course ?? courses[0];
    const sampleBatch = sampleCourse.batches.find((b) => b.id === values.batchId) ?? sampleCourse.batches[0];
    const first = now === null ? undefined : upcomingClasses(sampleBatch.slot, 1, new Date(now))[0];
    setValues({
      courseId: sampleCourse.id,
      batchId: sampleBatch.id,
      date: first ? dhakaDateKey(first) : "",
      studentName: tDemo("sampleName"),
      guardianPhone: "01700000002",
    });
    setErrors({});
    setFormError(null);
    setCaptchaActive(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      // A dropped connection rejects the call; show it as a form error, not a crashed page.
      const res = await bookTrial(data).catch(() => ({ ok: false as const, fieldErrors: undefined, formError: "generic" as const }));
      setResetSignal((n) => n + 1);
      if (res.ok) {
        setBooking(res.booking);
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.formError ?? null);
      const firstInvalid = Object.keys(res.fieldErrors ?? {})[0];
      if (firstInvalid) formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    });
  }

  if (booking) {
    const bookedCourse = courses.find((c) => c.id === booking.courseId) ?? course;
    const bookedBatch = bookedCourse?.batches.find((b) => b.id === booking.batchId) ?? batch;
    return (
      <Confirmation
        booking={booking}
        name={values.studentName}
        course={bookedCourse}
        batch={bookedBatch}
        location={location}
        onReset={() => {
          setBooking(null);
          setValues(initialValues(courses));
        }}
      />
    );
  }

  const input = (name: TrialField, hint?: string) => ({
    id: `trial-${name}`,
    name,
    value: values[name],
    onChange: (e: { target: { value: string } }) => update(name, e.target.value),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(`trial-${name}`, hint, errors[name]),
    className: inputClass,
  });
  const err = (field: TrialField) => (errors[field] ? tErrors(errors[field]) : undefined);
  const phoneHint = tForm("phoneHint");

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onFocus={() => setCaptchaActive(true)}
      noValidate
      className={`${card} relative space-y-5 p-6 sm:p-8`}
    >
      <input type="hidden" name="locale" value={locale} />

      {demo && (
        <button
          type="button"
          onClick={fillSample}
          className="rounded-md border-2 border-dashed border-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          {tDemo("fillSample")}
        </button>
      )}

      <div aria-live="polite" className="empty:hidden">
        {(hasErrors || formError) && (
          <p className="rounded-md bg-red-50 p-3 font-medium text-red-800">
            {formError ? tErrors(formError) : tForm("errorSummary")}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trial-courseId" label={t("course")} error={err("courseId")}>
          <select {...input("courseId")}>
            <option value="">{tForm("select")}</option>
            {levels.map((level) => (
              <optgroup key={level} label={tLevels(level)}>
                {courses
                  .filter((c) => c.level === level)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field id="trial-batchId" label={t("batch")} error={err("batchId")}>
          <select {...input("batchId")} disabled={!course}>
            <option value="">{course ? tForm("select") : tForm("selectCourseFirst")}</option>
            {course?.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset aria-describedby={describedBy("trial-date", t("dateHint"), errors.date)}>
        <legend className="font-medium text-ink">{t("date")}</legend>
        {!batch ? (
          <p className="mt-1.5 text-sm text-muted">{t("pickBatchFirst")}</p>
        ) : now !== null && dates.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted">{t("noDates")}</p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {dates.map((d) => {
              const key = dhakaDateKey(d);
              const checked = values.date === key;
              return (
                <label
                  key={key}
                  className={`cursor-pointer rounded-lg border px-3 py-2.5 text-center transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent ${
                    checked ? "border-brand bg-brand text-white" : "border-ink/20 bg-white text-ink hover:border-brand/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="date"
                    value={key}
                    checked={checked}
                    onChange={() => update("date", key)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{format.dateTime(d, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <span className={`block text-sm ${checked ? "text-white/80" : "text-muted"}`}>
                    {format.dateTime(d, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {errors.date ? (
          <p id="trial-date-error" className="mt-1 text-sm font-medium text-red-700">
            {tErrors(errors.date)}
          </p>
        ) : (
          <p id="trial-date-hint" className="mt-1 text-sm text-muted">
            {t("dateHint")}
          </p>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="trial-studentName" label={t("studentName")} error={err("studentName")}>
          <input {...input("studentName")} type="text" autoComplete="name" maxLength={60} />
        </Field>
        <Field id="trial-guardianPhone" label={t("guardianPhone")} hint={phoneHint} error={err("guardianPhone")}>
          <input
            {...input("guardianPhone", phoneHint)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01700000000"
          />
        </Field>
      </div>

      <Honeypot label={tForm("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />

      <button type="submit" disabled={pending} className={`${btnPrimary} disabled:opacity-60`}>
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

function Confirmation({
  booking,
  name,
  course,
  batch,
  location,
  onReset,
}: {
  booking: Booking;
  name: string;
  course?: TrialCourse;
  batch?: TrialCourse["batches"][number];
  location: string;
  onReset: () => void;
}) {
  const t = useTranslations("trial");
  const format = useFormatter();
  const locale = useLocale();
  const when = new Date(booking.classAt);

  function download() {
    if (!course || !batch) return;
    const ics = batchCalendar({
      uid: `${booking.ref}@alo-academy`,
      title: t("calendarTitle", { course: course.name }),
      description: t("calendarNote", { batch: batch.label, ref: booking.ref }),
      location,
      slot: batch.slot,
      once: when,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${booking.ref}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section aria-labelledby="trial-done" className={`${card} p-6 sm:p-8`}>
      <div className="flex items-start gap-4">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-10 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M7.5 12.5l3 3 6-6.5" />
        </svg>
        <div>
          <h2 id="trial-done" className="text-2xl font-semibold text-brand">
            {t("done.title")}
          </h2>
          <p className="mt-1 text-muted">{t("done.text", { name })}</p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 rounded-lg bg-surface p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">{t("done.when")}</dt>
          <dd className="font-semibold text-ink">
            {format.dateTime(when, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("done.class")}</dt>
          <dd className="font-semibold text-ink">{course?.name}</dd>
          <dd className="text-sm text-muted">{batch?.label}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("done.where")}</dt>
          <dd className="text-ink">{location}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t("done.ref")}</dt>
          <dd className="font-mono font-bold tracking-wider text-brand">{booking.ref}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted">{t("done.arrive")}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {course && batch && (
          <button type="button" onClick={download} className={btnSecondary}>
            {t("done.calendar")}
          </button>
        )}
        {course && (
          <Link href={`/${locale}/admission?course=${course.id}`} className={btnPrimary}>
            {t("done.apply")}
          </Link>
        )}
      </div>
      <button type="button" onClick={onReset} className="mt-6 font-semibold text-brand underline-offset-4 hover:underline">
        ← {t("done.another")}
      </button>
    </section>
  );
}
