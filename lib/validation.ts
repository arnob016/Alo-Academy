import { z } from "zod";
import { courses, levels } from "@/content/courses";
import { site } from "@/config/site";

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
  "verification",
  "generic",
] as const;
export type ErrorKey = (typeof errorKeys)[number];

/** Converts Bangla digits (০-৯) to English digits (0-9). */
export function toEnglishDigits(value: string) {
  return value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}

const text = z.string().trim();

/** Accepts "017…", "+88017…", spaces/dashes, and Bangla digits. */
const bdPhone = z
  .string()
  .transform((v) => toEnglishDigits(v).replace(/[\s-]/g, "").replace(/^\+?88(?=01)/, ""))
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
    courseId: text.min(1, "select"),
    batchId: text.min(1, "select"),
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
