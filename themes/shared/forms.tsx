"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { site } from "@/config/site";
import { courses as contentCourses, levels } from "@/content/courses";
import { Honeypot } from "@/components/forms/field";
import { Turnstile } from "@/components/forms/turnstile";
import { useAdmissionForm, type FormCourse, type PaymentMethod } from "@/components/forms/use-admission-form";
import { useContactForm } from "@/components/forms/use-contact-form";

/*
 * Theme-agnostic admission and contact forms. Each theme passes class names
 * (and optionally a confirm step); validation, submission and accessibility
 * live in the shared hooks so every theme behaves identically.
 */

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export type FormClasses = {
  field: string;
  label: string;
  input: string;
  hint: string;
  error: string;
  alert: string;
  ok: string;
  legend: string;
  radio: string;
  submit: string;
  demo: string;
};

export type ConfirmConfig = {
  title: string;
  text: string;
  yes: string;
  no: string;
  className: string;
  panelClassName: string;
  yesClassName: string;
  noClassName: string;
};

function Field({ id, label, hint, error, cls, children }: { id: string; label: string; hint?: string; error?: string; cls: FormClasses; children: ReactNode }) {
  return (
    <div className={cls.field}>
      <label htmlFor={id} className={cls.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={cls.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={cls.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function ConfirmDialog({ config, onYes, onNo }: { config: ConfirmConfig; onYes: () => void; onNo: () => void }) {
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    yesRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo]);

  // Portalled to <body> so no theme layout (fixed bars, stacking contexts) can cover it.
  return createPortal(
    <div className={config.className} role="dialog" aria-modal="true" aria-labelledby="theme-confirm-title">
      <div className={config.panelClassName}>
        <h2 id="theme-confirm-title">{config.title}</h2>
        <p>{config.text}</p>
        <div>
          <button ref={yesRef} type="button" className={config.yesClassName} onClick={onYes}>
            {config.yes}
          </button>
          <button type="button" className={config.noClassName} onClick={onNo}>
            {config.no}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Optional confirm step: holds the FormData (with its Turnstile token) until YES. */
function useConfirmStep(enabled: boolean, send: (data: FormData) => void) {
  const [held, setHeld] = useState<FormData | null>(null);
  return {
    open: held !== null,
    onSubmit: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      if (enabled) setHeld(data);
      else send(data);
    },
    yes: () => {
      if (held) send(held);
      setHeld(null);
    },
    no: () => setHeld(null),
  };
}

export function ThemedAdmissionForm({
  locale,
  cls,
  idPrefix,
  initialCourseId,
  demoLabel,
  submitLabel,
  pendingLabel,
  confirm,
  onFeedback,
}: {
  locale: Locale;
  cls: FormClasses;
  idPrefix: string;
  initialCourseId?: string;
  demoLabel?: ReactNode;
  submitLabel?: ReactNode;
  pendingLabel?: ReactNode;
  confirm?: ConfirmConfig;
  /** Called with "error" when the form shows errors (themes can play a sound). */
  onFeedback?: (kind: "error") => void;
}) {
  const t = useTranslations("form");
  const tErr = useTranslations("errors");
  const tDemo = useTranslations("demo");
  const tLevels = useTranslations("levels");

  const courses: FormCourse[] = useMemo(
    () =>
      contentCourses.map((course) => ({
        id: course.id,
        level: course.level,
        name: course.name[locale],
        admissionFee: course.admissionFee,
        batches: course.batches.map((b) => ({ id: b.id, label: b.label[locale], schedule: b.schedule[locale] })),
      })),
    [locale],
  );
  const methods = (Object.keys(site.payments.methods) as PaymentMethod[]).filter((m) => site.payments.methods[m]);

  const {
    formRef,
    values,
    errors,
    formError,
    hasErrors,
    pending,
    course,
    levelCourses,
    captchaActive,
    activateCaptcha,
    resetSignal,
    update,
    field,
    fillSample,
    submit,
  } = useAdmissionForm({
    courses,
    methods,
    locale,
    initialCourseId,
    sampleName: site.demo.enabled ? tDemo("sampleName") : "",
    idPrefix,
  });
  const step = useConfirmStep(Boolean(confirm), submit);

  useEffect(() => {
    if (hasErrors || formError) onFeedback?.("error");
  }, [hasErrors, formError, onFeedback]);

  const err = (name: keyof typeof errors) => (errors[name] ? tErr(errors[name]) : undefined);
  const input = (name: Parameters<typeof field>[0], hint?: string) => ({ ...field(name, hint), className: cls.input });
  const id = (name: string) => `${idPrefix}${name}`;
  const phoneHint = t("phoneHint");
  const amountHint = course ? t("amountHint", { amount: course.admissionFee }) : undefined;

  return (
    <form ref={formRef} onSubmit={step.onSubmit} onFocus={activateCaptcha} noValidate style={{ position: "relative" }}>
      {site.demo.enabled && (
        <button type="button" className={cls.demo} onClick={fillSample}>
          {demoLabel ?? tDemo("fillSample")}
        </button>
      )}

      <div aria-live="assertive">
        {(hasErrors || formError) && <p className={cls.alert}>{formError ? tErr(formError) : t("errorSummary")}</p>}
      </div>

      <Field id={id("studentName")} label={t("studentName")} error={err("studentName")} cls={cls}>
        <input {...input("studentName")} type="text" autoComplete="name" maxLength={60} />
      </Field>
      <Field id={id("level")} label={t("level")} error={err("level")} cls={cls}>
        <select {...input("level")}>
          <option value="">{t("select")}</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {tLevels(level)}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("courseId")} label={t("course")} error={err("courseId")} cls={cls}>
        <select {...input("courseId")} disabled={!values.level}>
          <option value="">{values.level ? t("select") : t("selectLevelFirst")}</option>
          {levelCourses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("batchId")} label={t("batch")} error={err("batchId")} cls={cls}>
        <select {...input("batchId")} disabled={!course}>
          <option value="">{course ? t("select") : t("selectCourseFirst")}</option>
          {course?.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} — {b.schedule}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("studentPhone")} label={t("studentPhone")} hint={phoneHint} error={err("studentPhone")} cls={cls}>
        <input {...input("studentPhone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </Field>
      <Field id={id("guardianPhone")} label={t("guardianPhone")} hint={phoneHint} error={err("guardianPhone")} cls={cls}>
        <input {...input("guardianPhone", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
      </Field>

      <fieldset className={cls.field} style={{ border: 0, padding: 0, minInlineSize: 0 }}>
        <legend className={cls.legend}>{t("method")}</legend>
        {methods.map((method) => (
          <label key={method} className={cls.radio}>
            <input type="radio" name="method" value={method} checked={values.method === method} onChange={() => update("method", method)} />
            {t(`methods.${method}`)}
          </label>
        ))}
      </fieldset>

      <Field id={id("senderNumber")} label={t("senderNumber")} hint={phoneHint} error={err("senderNumber")} cls={cls}>
        <input {...input("senderNumber", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
      </Field>
      <Field id={id("amount")} label={t("amount")} hint={amountHint} error={err("amount")} cls={cls}>
        <input {...input("amount", amountHint)} type="text" inputMode="numeric" />
      </Field>
      <Field id={id("trxId")} label={t("trxId")} hint={t("trxIdHint")} error={err("trxId")} cls={cls}>
        <input
          {...input("trxId", t("trxIdHint"))}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        />
      </Field>

      <Honeypot label={t("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />

      <button type="submit" className={cls.submit} disabled={pending}>
        {pending ? (pendingLabel ?? t("submitting")) : (submitLabel ?? t("submit"))}
      </button>
      <p className={cls.hint}>{t("privacy")}</p>

      {confirm && step.open && <ConfirmDialog config={confirm} onYes={step.yes} onNo={step.no} />}
    </form>
  );
}

export function ThemedContactForm({
  locale,
  cls,
  idPrefix,
  submitLabel,
  confirm,
  onSent,
  onFeedback,
}: {
  locale: Locale;
  cls: FormClasses;
  idPrefix: string;
  submitLabel?: ReactNode;
  confirm?: ConfirmConfig;
  /** Fires once per successful send (e.g. Sketchbook's paper airplane). */
  onSent?: () => void;
  onFeedback?: (kind: "error") => void;
}) {
  const t = useTranslations("contactForm");
  const tForm = useTranslations("form");
  const tErr = useTranslations("errors");
  const { formRef, errors, formError, hasErrors, sent, pending, captchaActive, activateCaptcha, resetSignal, field, submit } =
    useContactForm({ idPrefix });
  const step = useConfirmStep(Boolean(confirm), submit);

  useEffect(() => {
    if (sent) onSent?.();
  }, [sent, onSent]);
  useEffect(() => {
    if (hasErrors || formError) onFeedback?.("error");
  }, [hasErrors, formError, onFeedback]);

  const err = (name: keyof typeof errors) => (errors[name] ? tErr(errors[name]) : undefined);
  const input = (name: Parameters<typeof field>[0], hint?: string) => ({ ...field(name, hint), className: cls.input });
  const phoneHint = tForm("phoneHint");

  return (
    <form ref={formRef} onSubmit={step.onSubmit} onFocus={activateCaptcha} noValidate style={{ position: "relative" }}>
      <input type="hidden" name="locale" value={locale} />
      <div aria-live="polite">
        {sent && <p className={cls.ok}>{t("sent")}</p>}
        {!sent && (hasErrors || formError) && <p className={cls.alert}>{formError ? tErr(formError) : tForm("errorSummary")}</p>}
      </div>

      <Field id={`${idPrefix}name`} label={t("name")} error={err("name")} cls={cls}>
        <input {...input("name")} type="text" autoComplete="name" maxLength={60} />
      </Field>
      <Field id={`${idPrefix}phone`} label={t("phone")} hint={phoneHint} error={err("phone")} cls={cls}>
        <input {...input("phone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </Field>
      <Field id={`${idPrefix}message`} label={t("message")} error={err("message")} cls={cls}>
        <textarea {...input("message")} rows={4} maxLength={1000} />
      </Field>

      <Honeypot label={t("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />
      <button type="submit" className={cls.submit} disabled={pending}>
        {pending ? t("submitting") : (submitLabel ?? t("submit"))}
      </button>

      {confirm && step.open && <ConfirmDialog config={confirm} onYes={step.yes} onNo={step.no} />}
    </form>
  );
}
