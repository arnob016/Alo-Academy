"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { AdmissionField } from "@/lib/validation";
import type { Level } from "@/content/courses";
import { Field, Honeypot, inputClass } from "./field";
import { Turnstile } from "./turnstile";
import { useAdmissionForm, type FormCourse, type PaymentMethod } from "./use-admission-form";

export type { FormCourse };

type AdmissionFormProps = {
  courses: FormCourse[];
  levels: readonly Level[];
  methods: PaymentMethod[];
  demo: boolean;
  turnstileSiteKey: string;
  initialCourseId?: string;
};

/** Pre-selects the course from `?course=` (used by "Apply for this course" links). */
export function AdmissionFormFromUrl(props: Omit<AdmissionFormProps, "initialCourseId">) {
  const courseId = useSearchParams().get("course") ?? undefined;
  return <AdmissionForm {...props} initialCourseId={courseId} />;
}

export function AdmissionForm({
  courses,
  levels,
  methods,
  demo,
  turnstileSiteKey,
  initialCourseId,
}: AdmissionFormProps) {
  const t = useTranslations("form");
  const tErr = useTranslations("errors");
  const tDemo = useTranslations("demo");
  const tLevels = useTranslations("levels");
  const locale = useLocale();
  const form = useAdmissionForm({
    courses,
    methods,
    locale,
    initialCourseId,
    sampleName: demo ? tDemo("sampleName") : "",
  });
  const { formRef, values, errors, formError, hasErrors, pending, course, levelCourses } = form;
  const { captchaActive, resetSignal, update, fillSample, onSubmit } = form;

  const err = (field: AdmissionField) => (errors[field] ? tErr(errors[field]) : undefined);
  const input = (field: AdmissionField, hint?: string) => ({ ...form.field(field, hint), className: inputClass });

  const phoneHint = t("phoneHint");
  const amountHint = course ? t("amountHint", { amount: course.admissionFee }) : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onFocus={form.activateCaptcha}
      noValidate
      className="relative space-y-5"
    >
      {demo && (
        <button
          type="button"
          onClick={fillSample}
          className="w-full rounded-md border-2 border-dashed border-zinc-900 bg-zinc-50 px-4 py-2.5 font-semibold text-zinc-900 hover:bg-zinc-100"
        >
          {tDemo("fillSample")}
        </button>
      )}

      <div aria-live="assertive" className="empty:hidden">
        {(hasErrors || formError) && (
          <p className="rounded-md bg-red-50 p-3 font-medium text-red-800">
            {formError ? tErr(formError) : t("errorSummary")}
          </p>
        )}
      </div>

      <Field id="studentName" label={t("studentName")} error={err("studentName")}>
        <input {...input("studentName")} type="text" autoComplete="name" maxLength={60} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="level" label={t("level")} error={err("level")}>
          <select {...input("level")}>
            <option value="">{t("select")}</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {tLevels(level)}
              </option>
            ))}
          </select>
        </Field>

        <Field id="courseId" label={t("course")} error={err("courseId")}>
          <select {...input("courseId")} disabled={!values.level}>
            <option value="">{values.level ? t("select") : t("selectLevelFirst")}</option>
            {levelCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="batchId" label={t("batch")} error={err("batchId")}>
        <select {...input("batchId")} disabled={!course}>
          <option value="">{course ? t("select") : t("selectCourseFirst")}</option>
          {course?.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} — {b.schedule}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="studentPhone" label={t("studentPhone")} hint={phoneHint} error={err("studentPhone")}>
          <input {...input("studentPhone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
        </Field>
        <Field id="guardianPhone" label={t("guardianPhone")} hint={phoneHint} error={err("guardianPhone")}>
          <input {...input("guardianPhone", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
        </Field>
      </div>

      <fieldset>
        <legend className="font-medium text-ink">{t("method")}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {methods.map((method) => (
            <label
              key={method}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-ink/25 bg-white px-4 py-2.5 has-checked:border-brand has-checked:bg-brand/5"
            >
              <input
                type="radio"
                name="method"
                value={method}
                checked={values.method === method}
                onChange={() => update("method", method)}
                className="accent-brand"
              />
              {t(`methods.${method}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="senderNumber" label={t("senderNumber")} hint={phoneHint} error={err("senderNumber")}>
          <input {...input("senderNumber", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
        </Field>
        <Field id="amount" label={t("amount")} hint={amountHint} error={err("amount")}>
          <input {...input("amount", amountHint)} type="text" inputMode="numeric" />
        </Field>
      </div>

      <Field id="trxId" label={t("trxId")} hint={t("trxIdHint")} error={err("trxId")}>
        <input
          {...input("trxId", t("trxIdHint"))}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          className={`${inputClass} uppercase tracking-wider`}
        />
      </Field>

      <Honeypot label={t("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-6 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-70"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
      <p className="text-center text-sm text-muted">{t("privacy")}</p>
    </form>
  );
}
