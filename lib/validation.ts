import { z } from "zod";
import { courses, levels } from "@/content/courses";
import { site } from "@/config/site";
import { REF_PATTERN, TRIAL_REF_PATTERN } from "./ref";
import { classStartOn, TRIAL_WINDOW_DAYS } from "./schedule";

/**
 * Error messages are translation keys under `errors.*` in /messages.
 * Keep this list in sync with those keys.
 */
export const errorKeys = [
  "required",
  "select",
  "nameLength",
  "phone",
  "amount",
  "amountMismatch",
  "trxId",
  "messageLength",
  "ref",
  "notFound",
  "date",
  "credentials",
  "passwordLength",
  "email",
  "phoneTaken",
  "emailTaken",
  "rateLimited",
  "verification",
  "generic",
] as const;
export type ErrorKey = (typeof errorKeys)[number];

/** Converts Bangla digits (০-৯) to English digits (0-9). */
export function toEnglishDigits(value: string) {
  return value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}

const text = z.string().trim();

/** A select's value. Disabled selects aren't submitted, so a missing value also means "choose one". */
const choice = z.string({ error: "select" }).trim().min(1, "select");

/** "+88 017-1234 5678" or Bangla digits → "01712345678" (not yet checked for validity). */
export function normalizePhone(value: string) {
  return toEnglishDigits(value).replace(/[\s-]/g, "").replace(/^\+?88(?=01)/, "");
}

/**
 * Compares the last 10 digits, so a Sheet cell that was edited by hand and lost
 * its leading zero (or gained "+88") still matches.
 */
export function samePhone(stored: string, entered: string) {
  const digits = stored.replace(/\D/g, "");
  return digits.length >= 10 && digits.slice(-10) === entered.replace(/\D/g, "").slice(-10);
}

const bdPhone = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().min(1, "required").regex(/^01[3-9]\d{8}$/, "phone"));

const amount = z
  .string()
  .transform((v) => toEnglishDigits(v).replace(/[\s,৳]/g, ""))
  .pipe(z.string().min(1, "required").regex(/^\d+$/, "amount"))
  .transform(Number);

const trxId = z
  .string()
  .transform((v) => toEnglishDigits(v).trim().toUpperCase())
  .pipe(z.string().min(1, "required").regex(/^[A-Z0-9]{10}$/, "trxId"));

const paymentMethods = (
  Object.keys(site.payments.methods) as (keyof typeof site.payments.methods)[]
).filter((m) => site.payments.methods[m]);

const name = text.min(1, "required").min(2, "nameLength").max(60, "nameLength");

export const admissionSchema = z
  .object({
    studentName: name,
    level: z.enum(levels, { error: "select" }),
    courseId: choice,
    batchId: choice,
    studentPhone: bdPhone,
    guardianPhone: bdPhone,
    method: z.enum(paymentMethods as [string, ...string[]], { error: "select" }),
    senderNumber: bdPhone,
    amount,
    trxId,
  })
  .superRefine((data, ctx) => {
    const course = courses.find((c) => c.id === data.courseId && c.level === data.level);
    if (!course) {
      ctx.addIssue({ code: "custom", path: ["courseId"], message: "select" });
      return;
    }
    if (!course.batches.some((b) => b.id === data.batchId)) {
      ctx.addIssue({ code: "custom", path: ["batchId"], message: "select" });
    }
    if (typeof data.amount === "number" && data.amount !== course.admissionFee) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "amountMismatch" });
    }
  });

export type AdmissionInput = z.output<typeof admissionSchema>;
export type AdmissionField = keyof z.input<typeof admissionSchema>;

export const contactSchema = z.object({
  name,
  phone: bdPhone,
  message: text.min(5, "messageLength").max(1000, "messageLength"),
});

export type ContactField = keyof z.input<typeof contactSchema>;

export const trackSchema = z.object({
  ref: z
    .string()
    .transform((v) => toEnglishDigits(v).trim().toUpperCase().replace(/\s+/g, ""))
    .pipe(z.string().min(1, "required").regex(REF_PATTERN, "ref")),
  phone: bdPhone,
});

export type TrackField = keyof z.input<typeof trackSchema>;


export const trialSchema = z
  .object({
    studentName: name,
    guardianPhone: bdPhone,
    courseId: choice,
    batchId: choice,
    date: z.string({ error: "date" }).trim().regex(/^\d{4}-\d{2}-\d{2}$/, "date"),
  })
  .superRefine((data, ctx) => {
    const course = courses.find((c) => c.id === data.courseId);
    if (!course) {
      ctx.addIssue({ code: "custom", path: ["courseId"], message: "select" });
      return;
    }
    const batch = course.batches.find((b) => b.id === data.batchId);
    if (!batch) {
      ctx.addIssue({ code: "custom", path: ["batchId"], message: "select" });
      return;
    }
    // Must be a real class of this batch, still ahead, and inside the booking window.
    const start = classStartOn(batch.slot, data.date)?.getTime();
    const now = Date.now();
    if (!start || start <= now || start > now + TRIAL_WINDOW_DAYS * 86_400_000) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "date" });
    }
  });

export type TrialField = keyof z.input<typeof trialSchema>;

/* ---------- Accounts ---------- */

export const signInSchema = z.object({
  login: text.min(1, "required"),
  password: z.string().min(1, "required"),
});

export type SignInField = keyof z.input<typeof signInSchema>;

// 128 is plenty, and stops someone making the server hash megabytes.
const newPassword = z.string().min(1, "required").min(8, "passwordLength").max(128, "passwordLength");

export const registerSchema = z.object({
  name,
  phone: bdPhone,
  // Optional: "" when left blank or not sent at all.
  email: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim().toLowerCase())
    .pipe(
      z
        .string()
        .max(254, "email")
        .refine((v) => v === "" || z.email().safeParse(v).success, "email"),
    ),
  password: newPassword,
});

export type RegisterField = keyof z.input<typeof registerSchema>;

const anyRef = z
  .string()
  .transform((v) => toEnglishDigits(v).trim().toUpperCase().replace(/\s+/g, ""))
  .pipe(
    z
      .string()
      .min(1, "required")
      .refine((v) => REF_PATTERN.test(v) || TRIAL_REF_PATTERN.test(v), "ref"),
  );

export const linkSchema = z.object({ ref: anyRef, phone: bdPhone });

export type LinkField = keyof z.input<typeof linkSchema>;

/** First error per field, mapped to a known translation key. */
export function fieldErrors<F extends string>(error: z.ZodError) {
  const out: Partial<Record<F, ErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as F | undefined;
    if (!field || out[field]) continue;
    out[field] = (errorKeys as readonly string[]).includes(issue.message)
      ? (issue.message as ErrorKey)
      : "required";
  }
  return out;
}
