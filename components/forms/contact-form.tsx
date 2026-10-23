"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ContactField } from "@/lib/validation";
import { Field, Honeypot, inputClass } from "./field";
import { Turnstile } from "./turnstile";
import { useContactForm } from "./use-contact-form";

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const t = useTranslations("contactForm");
  const tForm = useTranslations("form");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const form = useContactForm();
  const { formRef, errors, formError, hasErrors, sent, pending, captchaActive, resetSignal } = form;

  const err = (field: ContactField) => (errors[field] ? tErr(errors[field]) : undefined);
  const input = (field: ContactField, hint?: string) => ({ ...form.field(field, hint), className: inputClass });
  const phoneHint = tForm("phoneHint");

  return (
    <form
      ref={formRef}
      onSubmit={form.onSubmit}
      onFocus={form.activateCaptcha}
      noValidate
      className="relative space-y-5"
    >
      <input type="hidden" name="locale" value={locale} />

      <div aria-live="polite" className="empty:hidden">
        {sent && <p className="rounded-md bg-brand/10 p-3 font-medium text-brand">{t("sent")}</p>}
        {!sent && (hasErrors || formError) && (
          <p className="rounded-md bg-red-50 p-3 font-medium text-red-800">
            {formError ? tErr(formError) : tForm("errorSummary")}
          </p>
        )}
      </div>

      <Field id="contact-name" label={t("name")} error={err("name")}>
        <input {...input("name")} type="text" autoComplete="name" maxLength={60} />
      </Field>
      <Field id="contact-phone" label={t("phone")} hint={phoneHint} error={err("phone")}>
        <input {...input("phone", phoneHint)} type="tel" inputMode="tel" autoComplete="tel" placeholder="01700000000" />
      </Field>
      <Field id="contact-message" label={t("message")} error={err("message")}>
        <textarea {...input("message")} rows={5} maxLength={1000} />
      </Field>

      <Honeypot label={t("honeypot")} />
      <Turnstile siteKey={turnstileSiteKey} active={captchaActive} resetSignal={resetSignal} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-70"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
