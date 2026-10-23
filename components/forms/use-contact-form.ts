"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { submitContact } from "@/lib/actions";
import type { ContactField, ErrorKey } from "@/lib/validation";
import { describedBy } from "./field";

const empty: Record<ContactField, string> = { name: "", phone: "", message: "" };

/** Contact form state and submission, shared by every theme. */
export function useContactForm({ idPrefix = "contact-" }: { idPrefix?: string } = {}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<ContactField, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaActive, setCaptchaActive] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [pending, startTransition] = useTransition();

  const hasErrors = Object.values(errors).some(Boolean);

  function update(field: ContactField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setSent(false);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitContact(formData);
      setResetSignal((n) => n + 1);
      if (result.ok) {
        setValues(empty);
        setErrors({});
        setFormError(null);
        setSent(true);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
      const firstInvalid = Object.keys(result.fieldErrors ?? {})[0];
      if (firstInvalid) {
        formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      }
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(new FormData(event.currentTarget));
  }

  const field = (name: ContactField, hint?: string) => {
    const id = `${idPrefix}${name}`;
    return {
      id,
      name,
      value: values[name],
      onChange: (e: { target: { value: string } }) => update(name, e.target.value),
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": describedBy(id, hint, errors[name]),
    };
  };

  return {
    formRef,
    values,
    errors,
    formError,
    hasErrors,
    sent,
    pending,
    captchaActive,
    activateCaptcha: () => setCaptchaActive(true),
    resetSignal,
    field,
    submit,
    onSubmit,
  };
}
