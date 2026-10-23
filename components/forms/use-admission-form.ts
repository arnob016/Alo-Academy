"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { submitAdmission } from "@/lib/actions";
import type { AdmissionField, ErrorKey } from "@/lib/validation";
import type { Level } from "@/content/courses";
import { describedBy } from "./field";

/**
 * Admission form state and submission, shared by every theme. Themes only
 * supply markup; errors come back as `errors.*` translation keys.
 */

export type FormCourse = {
  id: string;
  level: Level;
  name: string;
  admissionFee: number;
  batches: { id: string; label: string; schedule: string }[];
};

export type PaymentMethod = "bkash" | "nagad" | "rocket";
type Values = Record<AdmissionField, string>;

const SAMPLE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function sampleTrxId() {
  let id = "DEMO";
  for (let i = 0; i < 6; i++) id += SAMPLE_CHARS[Math.floor(Math.random() * SAMPLE_CHARS.length)];
  return id;
}

function initialValues(courses: FormCourse[], method: PaymentMethod, courseId?: string): Values {
  const course = courses.find((c) => c.id === courseId);
  return {
    studentName: "",
    level: course?.level ?? "",
    courseId: course?.id ?? "",
    batchId: course?.batches.length === 1 ? course.batches[0].id : "",
    studentPhone: "",
    guardianPhone: "",
    method,
    senderNumber: "",
    amount: "",
    trxId: "",
  };
}

export function useAdmissionForm({
  courses,
  methods,
  locale,
  initialCourseId,
  sampleName,
  idPrefix = "",
}: {
  courses: FormCourse[];
  methods: PaymentMethod[];
  locale: string;
  initialCourseId?: string;
  sampleName: string;
  /** Prefix for element ids, so two forms can't collide. */
  idPrefix?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState(() => initialValues(courses, methods[0], initialCourseId));
  const [errors, setErrors] = useState<Partial<Record<AdmissionField, ErrorKey>>>({});
  const [formError, setFormError] = useState<ErrorKey | null>(null);
  const [captchaActive, setCaptchaActive] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [pending, startTransition] = useTransition();

  const levelCourses = courses.filter((c) => c.level === values.level);
  const course = courses.find((c) => c.id === values.courseId);
  const hasErrors = Object.values(errors).some(Boolean);

  function update(field: AdmissionField, value: string) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "level") {
        next.courseId = "";
        next.batchId = "";
      }
      if (field === "courseId") {
        const selected = courses.find((c) => c.id === value);
        next.batchId = selected?.batches.length === 1 ? selected.batches[0].id : "";
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function fillSample() {
    // Keep the visitor's course choice if they already made one.
    const sample = course ?? courses[0];
    setValues({
      studentName: sampleName,
      level: sample.level,
      courseId: sample.id,
      batchId: values.batchId && course ? values.batchId : sample.batches[0].id,
      studentPhone: "01700000001",
      guardianPhone: "01700000002",
      method: methods[0],
      senderNumber: "01700000002",
      amount: String(sample.admissionFee),
      trxId: sampleTrxId(),
    });
    setErrors({});
    setFormError(null);
    setCaptchaActive(true);
  }

  /** Sends the form. Themes that confirm first ("Save your game?") call this directly. */
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitAdmission(formData);
      if (result.ok) {
        router.push(`/${locale}/admission/success?ref=${encodeURIComponent(result.ref ?? "")}`);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.formError ?? null);
      setResetSignal((n) => n + 1);

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

  /** Props for a text input or select bound to `field`. */
  const field = (name: AdmissionField, hint?: string) => {
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
    pending,
    course,
    levelCourses,
    captchaActive,
    activateCaptcha: () => setCaptchaActive(true),
    resetSignal,
    update,
    field,
    fillSample,
    submit,
    onSubmit,
  };
}
