import { z } from "zod";
import { courses, getCourse } from "@/content/courses";
import { noticeTags } from "@/content/notices";
import { attendanceMarks, feeMethods, studentStatuses } from "./office-constants";
import { normalizePhone, toEnglishDigits } from "./validation";

/*
 * Input checks for the office's Server Actions. Messages are translation keys
 * under `office.errors.*`; keep `officeErrorKeys` in sync with them.
 */

export const officeErrorKeys = [
  "unauthorized",
  "generic",
  "notFound",
  "required",
  "select",
  "nameLength",
  "phone",
  "roll",
  "rollTaken",
  "date",
  "notesLength",
  "months",
  "alreadyPaid",
  "amount",
  "title",
  "titleLength",
  "body",
  "bodyLength",
  "fullMarks",
  "passMarks",
  "marks",
  "scores",
  "duplicateRoll",
  "sample",
  "demo",
  "self",
  "staffEmail",
] as const;
export type OfficeErrorKey = (typeof officeErrorKeys)[number];

const BD_PHONE = /^01[3-9]\d{8}$/;

/** A real calendar date as "YYYY-MM-DD". */
const dateKey = z
  .string({ error: "date" })
  .trim()
  .refine((v) => {
    const date = new Date(`${v}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(v);
  }, "date");

/** `undefined` means "leave as it is" (the office sees masked phones in demo mode). */
const phoneOrKeep = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : normalizePhone(v)));

const roll = z
  .string()
  .transform((v) => toEnglishDigits(v).trim().toUpperCase())
  .pipe(z.string().max(12, "roll").regex(/^[A-Z0-9-]*$/, "roll"));

const name = z.string().trim().min(1, "required").min(2, "nameLength").max(60, "nameLength");

const courseAndBatch = <T extends { courseId: string; batchId: string }>(data: T, ctx: z.RefinementCtx) => {
  const course = getCourse(data.courseId);
  if (!course) ctx.addIssue({ code: "custom", path: ["courseId"], message: "select" });
  else if (!course.batches.some((b) => b.id === data.batchId)) {
    ctx.addIssue({ code: "custom", path: ["batchId"], message: "select" });
  }
};

export const studentSchema = z
  .object({
    /** "" for a new student. */
    id: z.string().trim().max(40).optional().transform((v) => v ?? ""),
    name,
    roll,
    courseId: z.string({ error: "select" }).trim(),
    batchId: z.string({ error: "select" }).trim(),
    studentPhone: phoneOrKeep,
    guardianPhone: phoneOrKeep,
    joined: dateKey,
    status: z.enum(studentStatuses, { error: "select" }),
    notes: z.string().trim().max(300, "notesLength").optional().transform((v) => v ?? ""),
  })
  .superRefine((data, ctx) => {
    courseAndBatch(data, ctx);
    // The student's own phone is optional; the guardian's is how the office reaches the family.
    if (data.studentPhone && !BD_PHONE.test(data.studentPhone)) {
      ctx.addIssue({ code: "custom", path: ["studentPhone"], message: "phone" });
    }
    if (data.guardianPhone === "" || (data.guardianPhone === undefined && !data.id)) {
      ctx.addIssue({ code: "custom", path: ["guardianPhone"], message: "required" });
    } else if (data.guardianPhone !== undefined && !BD_PHONE.test(data.guardianPhone)) {
      ctx.addIssue({ code: "custom", path: ["guardianPhone"], message: "phone" });
    }
  });
export type StudentInput = z.input<typeof studentSchema>;

export const paymentSchema = z.object({
  studentId: z.string().trim().min(1, "notFound").max(40),
  months: z
    .array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "months"), { error: "months" })
    .min(1, "months")
    .max(24, "months"),
  amount: z
    .union([z.number(), z.string()], { error: "amount" })
    .transform((v) => Number(typeof v === "number" ? v : toEnglishDigits(v).replace(/[\s,৳]/g, "")))
    .pipe(z.number({ error: "amount" }).int("amount").min(1, "amount").max(1_000_000, "amount")),
  method: z.enum(feeMethods, { error: "select" }),
  note: z.string().trim().max(200, "notesLength").optional().transform((v) => v ?? ""),
});
export type PaymentInput = z.input<typeof paymentSchema>;

export const attendanceSchema = z
  .object({
    courseId: z.string(),
    batchId: z.string(),
    date: dateKey,
    marks: z.record(z.string().max(40), z.enum(attendanceMarks)),
  })
  .superRefine((data, ctx) => {
    courseAndBatch(data, ctx);
    if (Object.keys(data.marks).length > 500) ctx.addIssue({ code: "custom", path: ["marks"], message: "generic" });
  });
export type AttendanceInput = z.input<typeof attendanceSchema>;

const optionalText = (max: number, message: OfficeErrorKey) =>
  z.string().trim().max(max, message).optional().transform((v) => v ?? "");

export const noticeSchema = z
  .object({
    /** "" or missing for a new notice. */
    id: z.string().trim().max(40).optional().transform((v) => v ?? ""),
    date: dateKey,
    tag: z.enum(noticeTags, { error: "select" }),
    pinned: z.boolean().optional().transform(Boolean),
    titleBn: optionalText(120, "titleLength"),
    titleEn: optionalText(120, "titleLength"),
    bodyBn: optionalText(1000, "bodyLength"),
    bodyEn: optionalText(1000, "bodyLength"),
  })
  .superRefine((data, ctx) => {
    // Either language is enough; the board falls back to the other one.
    if (!data.titleBn && !data.titleEn) ctx.addIssue({ code: "custom", path: ["titleBn"], message: "title" });
    if (!data.bodyBn && !data.bodyEn) ctx.addIssue({ code: "custom", path: ["bodyBn"], message: "body" });
  });
export type NoticeInput = z.input<typeof noticeSchema>;

const marksNumber = z.number({ error: "marks" }).min(0, "marks");

export const examSchema = z
  .object({
    id: z.string().trim().max(40).optional().transform((v) => v ?? ""),
    courseId: z.string({ error: "select" }).refine((id) => courses.some((c) => c.id === id), "select"),
    date: dateKey,
    titleBn: optionalText(150, "titleLength"),
    titleEn: optionalText(150, "titleLength"),
    fullMarks: z.number({ error: "fullMarks" }).int("fullMarks").min(1, "fullMarks").max(1000, "fullMarks"),
    passMarks: z.number({ error: "passMarks" }).min(0, "passMarks"),
    scores: z
      .array(
        z.object({
          roll: roll.pipe(z.string().min(1, "roll")),
          // "|" and line breaks separate scores in the Sheet cell.
          name: z
            .string()
            .transform((v) => v.replace(/[|\r\n]+/g, " ").replace(/\s+/g, " ").trim())
            .pipe(z.string().max(60, "nameLength")),
          marks: marksNumber,
        }),
        { error: "scores" },
      )
      .min(1, "scores")
      .max(500, "scores"),
  })
  .superRefine((data, ctx) => {
    if (!data.titleBn && !data.titleEn) ctx.addIssue({ code: "custom", path: ["titleBn"], message: "title" });
    if (data.passMarks > data.fullMarks) ctx.addIssue({ code: "custom", path: ["passMarks"], message: "passMarks" });
    const seen = new Set<string>();
    data.scores.forEach((s, i) => {
      if (s.marks > data.fullMarks) ctx.addIssue({ code: "custom", path: ["scores", i, "marks"], message: "marks" });
      if (seen.has(s.roll)) ctx.addIssue({ code: "custom", path: ["scores", i, "roll"], message: "duplicateRoll" });
      seen.add(s.roll);
    });
  });
export type ExamInput = z.input<typeof examSchema>;

/** First error per field path ("name", "scores.3.marks"), mapped to a known key. */
export function officeFieldErrors(error: z.ZodError) {
  const out: Record<string, OfficeErrorKey> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "form";
    if (out[path]) continue;
    out[path] = (officeErrorKeys as readonly string[]).includes(issue.message) ? (issue.message as OfficeErrorKey) : "required";
  }
  return out;
}
