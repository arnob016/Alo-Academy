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
import type { PixelCopy } from "./copy";
import { sfx } from "./sound";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function PqField({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="pq-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="pq-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="pq-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** "Save your game?" — the confirm step before anything is sent. */
function SavePrompt({ title, text, c, onYes, onNo }: { title: string; text: string; c: PixelCopy; onYes: () => void; onNo: () => void }) {
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    yesRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNo]);

  // Portalled into the theme root so fixed layers (ground, walker) can't cover it.
  return createPortal(
    <div className="pq-modal" role="dialog" aria-modal="true" aria-labelledby="pq-save-title">
      <div className="pq-frame">
        <h2 id="pq-save-title" className="pq-h2">
          {title}
        </h2>
        <p style={{ marginTop: 12 }}>{text}</p>
        <div className="pq-choice">
          <button ref={yesRef} type="button" className="pq-btn" onClick={onYes}>
            <span className="pq-cursor">▶</span>
            {c.yes}
          </button>
          <button type="button" className="pq-btn pq-btn--ghost" onClick={onNo}>
            {c.no}
          </button>
        </div>
      </div>
    </div>,
    document.querySelector(".pq-root") ?? document.body,
  );
}

function Saving({ c }: { c: PixelCopy }) {
  return createPortal(
    <div className="pq-modal" role="status">
      <div className="pq-frame">
        <p className="pq-h2">
          <span className="pq-dots">{c.saving}</span>
        </p>
      </div>
    </div>,
    document.querySelector(".pq-root") ?? document.body,
  );
}

/** Holds the FormData between submit and the YES click (the Turnstile token goes with it). */
function useConfirm(send: (data: FormData) => void) {
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  return {
    open: pendingData !== null,
    request: (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      sfx.select();
      setPendingData(new FormData(e.currentTarget));
    },
    yes: () => {
      if (pendingData) send(pendingData);
      sfx.coin();
      setPendingData(null);
    },
    no: () => {
      sfx.blip();
      setPendingData(null);
    },
  };
}

export function PixelAdmissionForm({ locale, c, initialCourseId }: { locale: Locale; c: PixelCopy; initialCourseId?: string }) {
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
    formRef, values, errors, formError, hasErrors, pending, course, levelCourses,
    captchaActive, activateCaptcha, resetSignal, update, field, fillSample, submit,
  } = useAdmissionForm({
    courses,
    methods,
    locale,
    initialCourseId,
    sampleName: site.demo.enabled ? tDemo("sampleName") : "",
    idPrefix: "pq-",
  });
  const confirm = useConfirm(submit);

  useEffect(() => {
    if (hasErrors || formError) sfx.error();
  }, [hasErrors, formError]);

  const err = (name: keyof typeof errors) => (errors[name] ? tErr(errors[name]) : undefined);
  const input = (name: Parameters<typeof field>[0], hint?: string) => ({ ...field(name, hint), className: "pq-input" });
  const phoneHint = t("phoneHint");
  const amountHint = course ? t("amountHint", { amount: course.admissionFee }) : undefined;

  return (
    <form ref={formRef} onSubmit={confirm.request} onFocus={activateCaptcha} noValidate style={{ position: "relative" }}>
      {site.demo.enabled && (
        <button
          type="button"
          className="pq-btn pq-btn--alt pq-btn--wide"
          onClick={() => {
            sfx.coin();
            fillSample();
          }}
          style={{ marginBottom: 18 }}
        >
          ★ {c.autofill}
        </button>
      )}

      <div aria-live="assertive">
        {(hasErrors || formError) && (
          <p className="pq-alert" style={{ marginBottom: 14 }}>
            {formError ? tErr(formError) : t("errorSummary")}
          </p>
        )}
      </div>

      <PqField id="pq-studentName" label={t("studentName")} error={err("studentName")}>
        <input {...input("studentName")} type="text" autoComplete="name" maxLength={60} />
      </PqField>
      <PqField id="pq-level" label={t("level")} error={err("level")}>
        <select {...input("level")}>
          <option value="">{t("select")}</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {tLevels(level)}
            </option>
          ))}
        </select>
      </PqField>
      <PqField id="pq-courseId" label={t("course")} error={err("courseId")}>
        <select {...input("courseId")} disabled={!values.level}>
          <option value="">{values.level ? t("select") : t("selectLevelFirst")}</option>
          {levelCourses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </PqField>
      <PqField id="pq-batchId" label={t("batch")} error={err("batchId")}>
        <select {...input("batchId")} disabled={!course}>
          <option value="">{course ? t("select") : t("selectCourseFirst")}</option>
          {course?.batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} — {b.schedule}
            </option>
          ))}
        </select>
      </PqField>
      <PqField id="pq-studentPhone" label={t("studentPhone")} hint={phoneHint} error={err("studentPhone")}>
        <input {...input("studentPhone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </PqField>
      <PqField id="pq-guardianPhone" label={t("guardianPhone")} hint={phoneHint} error={err("guardianPhone")}>
        <input {...input("guardianPhone", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
      </PqField>

      <fieldset className="pq-field" style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
        <legend className="pq-legend">{t("method")}</legend>
        {methods.map((method) => (
          <label key={method} className="pq-radio">
            <input type="radio" name="method" value={method} checked={values.method === method} onChange={() => update("method", method)} />
            {t(`methods.${method}`)}
          </label>
        ))}
      </fieldset>

      <PqField id="pq-senderNumber" label={t("senderNumber")} hint={phoneHint} error={err("senderNumber")}>
        <input {...input("senderNumber", phoneHint)} type="tel" inputMode="tel" placeholder="01700000000" />
      </PqField>
      <PqField id="pq-amount" label={t("amount")} hint={amountHint} error={err("amount")}>
        <input {...input("amount", amountHint)} type="text" inputMode="numeric" />
      </PqField>
      <PqField id="pq-trxId" label={t("trxId")} hint={t("trxIdHint")} error={err("trxId")}>
        <input
          {...input("trxId", t("trxIdHint"))}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        />
      </PqField>

      <Honeypot label={t("honeypot")} />
      <div style={{ marginTop: 14 }}>
        <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />
      </div>

      <button type="submit" className="pq-btn pq-btn--wide" disabled={pending} style={{ marginTop: 18 }}>
        <span className="pq-cursor">▶</span>
        {t("submit")}
      </button>
      <p className="pq-hint" style={{ textAlign: "center" }}>
        {t("privacy")}
      </p>

      {confirm.open && <SavePrompt title={c.saveGame} text={c.saveGameText} c={c} onYes={confirm.yes} onNo={confirm.no} />}
      {pending && <Saving c={c} />}
    </form>
  );
}

export function PixelContactForm({ locale, c }: { locale: Locale; c: PixelCopy }) {
  const t = useTranslations("contactForm");
  const tForm = useTranslations("form");
  const tErr = useTranslations("errors");
  const { formRef, errors, formError, hasErrors, sent, pending, captchaActive, activateCaptcha, resetSignal, field, submit } =
    useContactForm({ idPrefix: "pq-contact-" });
  const confirm = useConfirm(submit);

  useEffect(() => {
    if (hasErrors || formError) sfx.error();
  }, [hasErrors, formError]);
  useEffect(() => {
    if (sent) sfx.fanfare();
  }, [sent]);

  const err = (name: keyof typeof errors) => (errors[name] ? tErr(errors[name]) : undefined);
  const input = (name: Parameters<typeof field>[0], hint?: string) => ({ ...field(name, hint), className: "pq-input" });
  const phoneHint = tForm("phoneHint");

  return (
    <form ref={formRef} onSubmit={confirm.request} onFocus={activateCaptcha} noValidate style={{ position: "relative" }}>
      <input type="hidden" name="locale" value={locale} />
      <div aria-live="polite">
        {sent && (
          <p className="pq-ok" style={{ marginBottom: 14 }}>
            ★ {c.saved} {t("sent")}
          </p>
        )}
        {!sent && (hasErrors || formError) && (
          <p className="pq-alert" style={{ marginBottom: 14 }}>
            {formError ? tErr(formError) : tForm("errorSummary")}
          </p>
        )}
      </div>

      <PqField id="pq-contact-name" label={t("name")} error={err("name")}>
        <input {...input("name")} type="text" autoComplete="name" maxLength={60} />
      </PqField>
      <PqField id="pq-contact-phone" label={t("phone")} hint={phoneHint} error={err("phone")}>
        <input {...input("phone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </PqField>
      <PqField id="pq-contact-message" label={t("message")} error={err("message")}>
        <textarea {...input("message")} rows={4} maxLength={1000} />
      </PqField>

      <Honeypot label={t("honeypot")} />
      <div style={{ marginTop: 14 }}>
        <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />
      </div>
      <button type="submit" className="pq-btn" disabled={pending} style={{ marginTop: 18 }}>
        <span className="pq-cursor">▶</span>
        {t("submit")}
      </button>

      {confirm.open && <SavePrompt title={c.saveGame} text={c.sendMessage} c={c} onYes={confirm.yes} onNo={confirm.no} />}
      {pending && <Saving c={c} />}
    </form>
  );
}
