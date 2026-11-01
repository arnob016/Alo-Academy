"use server";

import { site } from "@/config/site";
import { getCourse } from "@/content/courses";
import {
  findAdmission,
  listAdmissions,
  maskPhone,
  maskTrxId,
  sampleForTracking,
  saveAdmission,
  setAdmissionStatus,
  statuses,
  type AdmissionStatus,
} from "./admissions";
import { saveContactMessage } from "./contact-messages";
import { notifyAdmin } from "./email";
import { dhakaTimestamp, makeRef, REF_PATTERN } from "./ref";
import { classStartOn, nextClassStart } from "./schedule";
import { listUpcomingTrials, newTrialRef, saveTrial } from "./trials";
import { clientIp, currentUser, recordFailedAttempt, requireStaff, tooManyAttempts } from "./session";
import { sheetsConfigured } from "./sheets";
import { verifyTurnstile } from "./turnstile";
import { linkRefs } from "./users";
import {
  admissionSchema,
  contactSchema,
  fieldErrors,
  samePhone,
  trackSchema,
  trialSchema,
  type AdmissionField,
  type ContactField,
  type ErrorKey,
  type TrackField,
  type TrialField,
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

  try {
    await saveAdmission({
      ref,
      submittedAt: now.getTime(),
      studentName: data.studentName,
      level: data.level,
      courseId: course.id,
      batchId: batch.id,
      courseName: course.name.en,
      batchName: batch.label.en,
      studentPhone: data.studentPhone,
      guardianPhone: data.guardianPhone,
      method: data.method,
      senderNumber: data.senderNumber,
      amount: data.amount,
      trxId: data.trxId,
      status: "Pending",
      notes: "",
    });
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
  await linkToSignedInUser(ref);

  return { ok: true, ref };
}

/** Best effort: a submission made while signed in shows up on that account. */
async function linkToSignedInUser(ref: string) {
  try {
    const user = await currentUser();
    if (user) await linkRefs(user, [ref]);
  } catch (error) {
    console.error("[account] failed to link", ref, error);
  }
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
    await saveContactMessage({ name, phone, message, locale });
  } catch (error) {
    console.error("[contact] failed to append row", error);
    return { ok: false, formError: "generic" };
  }

  await notifyAdmin(`New message from ${name}`, [`Phone: ${phone}`, "", message]).catch(
    (error) => console.error("[contact] email failed", error),
  );

  return { ok: true };
}

/* ---------- Free trial class (public) ---------- */

export type TrialResult =
  | { ok: true; booking: { ref: string; classAt: number; courseId: string; batchId: string } }
  | { ok: false; fieldErrors?: Partial<Record<TrialField, ErrorKey>>; formError?: ErrorKey };

export async function bookTrial(formData: FormData): Promise<TrialResult> {
  // Honeypot filled: pretend it worked, store nothing.
  if (isBot(formData)) {
    return { ok: true, booking: { ref: newTrialRef(), classAt: Date.now(), courseId: "", batchId: "" } };
  }

  const parsed = trialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors<TrialField>(parsed.error) };
  if (!(await verifyTurnstile(formData.get("cf-turnstile-response")))) {
    return { ok: false, formError: "verification" };
  }

  const data = parsed.data;
  const course = getCourse(data.courseId)!;
  const batch = course.batches.find((b) => b.id === data.batchId)!;
  // The schema already checked this date is a class of the batch.
  const classAt = classStartOn(batch.slot, data.date)!.getTime();
  const now = new Date();
  const ref = newTrialRef(now);

  try {
    await saveTrial({
      ref,
      bookedAt: now.getTime(),
      studentName: data.studentName,
      guardianPhone: data.guardianPhone,
      courseId: course.id,
      batchId: batch.id,
      courseName: course.name.en,
      batchName: batch.label.en,
      classAt,
      locale: formData.get("locale") === "en" ? "en" : "bn",
    });
  } catch (error) {
    console.error("[trial] failed to append row", error);
    return { ok: false, formError: "generic" };
  }

  await notifyAdmin(`Trial class ${ref} — ${data.studentName}`, [
    `Reference: ${ref}`,
    `Student: ${data.studentName}`,
    `Class: ${course.name.en} (${batch.label.en}), ${dhakaTimestamp(new Date(classAt))}`,
    `Guardian phone: ${data.guardianPhone}`,
  ]).catch((error) => console.error("[trial] email failed", error));
  await linkToSignedInUser(ref);

  return { ok: true, booking: { ref, classAt, courseId: course.id, batchId: batch.id } };
}

/* ---------- Application tracker (public) ---------- */

export type TrackedApplication = {
  ref: string;
  studentName: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  submittedAt: number;
  status: AdmissionStatus;
  amount: number;
  method: string;
  /** Epoch ms of the first class, once the seat is confirmed. */
  firstClass: number | null;
};

export type TrackResult =
  | { ok: true; application: TrackedApplication }
  | { ok: false; fieldErrors?: Partial<Record<TrackField, ErrorKey>>; formError?: ErrorKey };

/** Looks an application up by reference plus the student's or guardian's phone. */
export async function trackAdmission(formData: FormData): Promise<TrackResult> {
  const parsed = trackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors<TrackField>(parsed.error) };
  const { ref, phone } = parsed.data;

  // Misses are counted per IP, so reference + phone pairs can't be guessed at speed.
  const keys = [`ip:track:${await clientIp()}`];
  if (tooManyAttempts(keys)) return { ok: false, formError: "rateLimited" };

  let found;
  try {
    found = await findAdmission(ref);
  } catch (error) {
    console.error("[track] lookup failed", error);
    return { ok: false, formError: "generic" };
  }
  // Same answer for "no such ref" and "wrong phone", so refs can't be probed.
  if (!found || !(samePhone(found.studentPhone, phone) || samePhone(found.guardianPhone, phone))) {
    recordFailedAttempt(keys);
    return { ok: false, formError: "notFound" };
  }

  const batch = getCourse(found.courseId)?.batches.find((b) => b.id === found.batchId);
  const firstClass =
    found.status === "Approved" && batch
      ? (nextClassStart(batch.slot, new Date(Math.max(Date.now(), found.submittedAt)))?.getTime() ?? null)
      : null;

  return {
    ok: true,
    application: {
      ref: found.ref,
      studentName: found.studentName,
      courseId: found.courseId,
      batchId: found.batchId,
      courseName: found.courseName,
      batchName: found.batchName,
      submittedAt: found.submittedAt,
      status: found.status,
      amount: found.amount,
      method: found.method,
      firstClass,
    },
  };
}

/** A sample reference and phone to try the tracker with (demo mode only). */
export async function getTrackingSample() {
  return site.demo.enabled ? sampleForTracking() : null;
}

/* ---------- Office dashboard ---------- */

/*
 * Staff only: every action re-checks the signed-in user's current role. In demo
 * mode the staff login is public, so phones and TrxIDs are masked there.
 */
const officePhone = (phone: string) => (site.demo.enabled ? maskPhone(phone) : phone);
const officeTrxId = (trxId: string) => (site.demo.enabled ? maskTrxId(trxId) : trxId);

export type OfficeAdmission = {
  ref: string;
  submittedAt: number;
  studentName: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  phone: string;
  method: string;
  sender: string;
  amount: number;
  /** The course's admission fee, to check the payment against. */
  expectedFee: number | null;
  trxId: string;
  status: AdmissionStatus;
  sample: boolean;
};

export type OfficeResult =
  | { ok: true; admissions: OfficeAdmission[]; source: "sheet" | "memory" }
  | { ok: false; error: "unauthorized" | "generic" };

export async function listOfficeAdmissions(): Promise<OfficeResult> {
  if (!(await requireStaff())) return { ok: false, error: "unauthorized" };
  try {
    const admissions = (await listAdmissions()).map((a) => ({
      ref: a.ref,
      submittedAt: a.submittedAt,
      studentName: a.studentName,
      courseId: a.courseId,
      batchId: a.batchId,
      courseName: a.courseName,
      batchName: a.batchName,
      phone: officePhone(a.studentPhone),
      method: a.method,
      sender: officePhone(a.senderNumber),
      amount: a.amount,
      expectedFee: getCourse(a.courseId)?.admissionFee ?? null,
      trxId: officeTrxId(a.trxId),
      status: a.status,
      sample: Boolean(a.sample),
    }));
    return { ok: true, admissions, source: sheetsConfigured() ? "sheet" : "memory" };
  } catch (error) {
    console.error("[office] failed to list admissions", error);
    return { ok: false, error: "generic" };
  }
}

export type OfficeTrial = {
  ref: string;
  studentName: string;
  phone: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  classAt: number;
  sample: boolean;
};

export async function listOfficeTrials(): Promise<{ ok: true; trials: OfficeTrial[] } | { ok: false }> {
  if (!(await requireStaff())) return { ok: false };
  try {
    const trials = (await listUpcomingTrials()).map((t) => ({
      ref: t.ref,
      studentName: t.studentName,
      phone: officePhone(t.guardianPhone),
      courseId: t.courseId,
      batchId: t.batchId,
      courseName: t.courseName,
      batchName: t.batchName,
      classAt: t.classAt,
      sample: Boolean(t.sample),
    }));
    return { ok: true, trials };
  } catch (error) {
    console.error("[office] failed to list trials", error);
    return { ok: false };
  }
}

export async function updateAdmissionStatus(ref: string, status: AdmissionStatus): Promise<{ ok: boolean }> {
  if (!(await requireStaff())) return { ok: false };
  if (typeof ref !== "string" || !REF_PATTERN.test(ref) || !statuses.includes(status)) return { ok: false };
  try {
    return { ok: await setAdmissionStatus(ref, status) };
  } catch (error) {
    console.error("[office] failed to update status", error);
    return { ok: false };
  }
}
