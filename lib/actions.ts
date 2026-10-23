"use server";

import { getCourse } from "@/content/courses";
import { notifyAdmin } from "./email";
import { dhakaTimestamp, makeRef } from "./ref";
import { appendRow } from "./sheets";
import { verifyTurnstile } from "./turnstile";
import {
  admissionSchema,
  contactSchema,
  fieldErrors,
  type AdmissionField,
  type ContactField,
  type ErrorKey,
} from "./validation";

export type FormResult<F extends string> =
  | { ok: true; ref?: string }
  | { ok: false; fieldErrors?: Partial<Record<F, ErrorKey>>; formError?: ErrorKey };

const isBot = (formData: FormData) => Boolean(formData.get("website"));

export async function submitAdmission(formData: FormData): Promise<FormResult<AdmissionField>> {
  // Honeypot filled: pretend it worked, store nothing.
  if (isBot(formData)) return { ok: true, ref: makeRef() };

  const parsed = admissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors<AdmissionField>(parsed.error) };
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { ok: false, formError: "verification" };
  }

  const data = parsed.data;
  const course = getCourse(data.courseId)!;
  const batch = course.batches.find((b) => b.id === data.batchId)!;
  const now = new Date();
  const ref = makeRef(now);

  // Columns: Timestamp | Ref No | Student Name | Class | Course | Batch | Student Phone |
  // Guardian Phone | Method | Sender Number | Amount | TrxID | Status | Notes
  const row = [
    dhakaTimestamp(now),
    ref,
    data.studentName,
    data.level.toUpperCase(),
    course.name.en,
    batch.label.en,
    data.studentPhone,
    data.guardianPhone,
    data.method,
    data.senderNumber,
    data.amount,
    data.trxId,
    "Pending",
    "",
  ];

  try {
    await appendRow("Admissions", row);
  } catch (error) {
    console.error("[admission] failed to append row", error);
    return { ok: false, formError: "generic" };
  }

  await notifyAdmin(`New admission ${ref} — ${data.studentName}`, [
    `Reference: ${ref}`,
    `Student: ${data.studentName}`,
    `Course: ${course.name.en} (${batch.label.en})`,
    `Guardian phone: ${data.guardianPhone}`,
    `${data.method} from ${data.senderNumber}: ৳${data.amount}, TrxID ${data.trxId}`,
  ]).catch((error) => console.error("[admission] email failed", error));

  return { ok: true, ref };
}

export async function submitContact(formData: FormData): Promise<FormResult<ContactField>> {
  if (isBot(formData)) return { ok: true };

  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors<ContactField>(parsed.error) };
  }
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { ok: false, formError: "verification" };
  }

  const { name, phone, message } = parsed.data;
  const locale = formData.get("locale") === "en" ? "en" : "bn";

  try {
    // Columns: Timestamp | Name | Phone | Message | Language
    await appendRow("Contact", [dhakaTimestamp(), name, phone, message, locale]);
  } catch (error) {
    console.error("[contact] failed to append row", error);
    return { ok: false, formError: "generic" };
  }

  await notifyAdmin(`New message from ${name}`, [`Phone: ${phone}`, "", message]).catch(
    (error) => console.error("[contact] email failed", error),
  );

  return { ok: true };
}
