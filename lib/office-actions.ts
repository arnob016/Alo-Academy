"use server";

import { site } from "@/config/site";
import { getCourse } from "@/content/courses";
import { maskPhone } from "./admissions";
import { listSessions, saveSession, type AttendanceSession } from "./attendance";
import { listPayments, newReceiptNo, savePayment, voidPayment, type FeePayment } from "./fees";
import {
  attendanceSchema,
  officeFieldErrors,
  paymentSchema,
  studentSchema,
  type AttendanceInput,
  type OfficeErrorKey,
  type PaymentInput,
  type StudentInput,
} from "./office-validation";
import { makeRef } from "./ref";
import { dhakaDateKey } from "./schedule";
import { requireStaff } from "./session";
import { sheetsConfigured } from "./sheets";
import { listStudents, saveStudent, type Student, type StudentRecord } from "./students";

/*
 * Office: student roster, monthly fees and attendance. Staff only: every action
 * re-checks the signed-in user's current role. In demo mode the staff login is
 * public, so phone numbers are masked (and can't be edited) there.
 */

export type OfficeFailure = { ok: false; error: OfficeErrorKey; fields?: Record<string, OfficeErrorKey> };
export type DataSource = "sheet" | "memory";

const masked = () => site.demo.enabled;
const source = (): DataSource => (sheetsConfigured() ? "sheet" : "memory");
const forOffice = (s: Student): Student =>
  masked() ? { ...s, studentPhone: maskPhone(s.studentPhone), guardianPhone: maskPhone(s.guardianPhone) } : s;

const unauthorized: OfficeFailure = { ok: false, error: "unauthorized" };
const generic: OfficeFailure = { ok: false, error: "generic" };

/* ---------- Students ---------- */

export type StudentsResult =
  | { ok: true; students: Student[]; masked: boolean; source: DataSource }
  | OfficeFailure;

export async function listOfficeStudents(): Promise<StudentsResult> {
  if (!(await requireStaff())) return unauthorized;
  try {
    return { ok: true, students: (await listStudents()).map(forOffice), masked: masked(), source: source() };
  } catch (error) {
    console.error("[office] failed to list students", error);
    return generic;
  }
}

export async function saveOfficeStudent(input: StudentInput): Promise<{ ok: true; student: Student } | OfficeFailure> {
  if (!(await requireStaff())) return unauthorized;
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required", fields: officeFieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    const students = await listStudents();
    const existing = data.id ? students.find((s) => s.id === data.id) : undefined;
    if (data.id && !existing) return { ok: false, error: "notFound" };
    // In demo mode the office only ever sees masked phones, so it can't edit them.
    if (masked() && existing && (data.studentPhone !== undefined || data.guardianPhone !== undefined)) {
      return { ok: false, error: "demo" };
    }
    if (
      data.roll &&
      data.status === "Active" &&
      students.some((s) => s.id !== data.id && s.status === "Active" && s.courseId === data.courseId && s.roll === data.roll)
    ) {
      return { ok: false, error: "rollTaken", fields: { roll: "rollTaken" } };
    }

    const course = getCourse(data.courseId)!;
    const batch = course.batches.find((b) => b.id === data.batchId)!;
    const record: StudentRecord = {
      id: existing?.id ?? makeRef(new Date(), "STU"),
      roll: data.roll,
      name: data.name,
      courseId: course.id,
      batchId: batch.id,
      courseName: course.name.en,
      batchName: batch.label.en,
      studentPhone: data.studentPhone ?? existing?.studentPhone ?? "",
      guardianPhone: data.guardianPhone ?? existing?.guardianPhone ?? "",
      joined: data.joined,
      status: data.status,
      notes: data.notes,
    };
    await saveStudent(record);
    return {
      ok: true,
      student: forOffice({ ...record, source: existing?.source ?? "office", sample: existing?.sample }),
    };
  } catch (error) {
    console.error("[office] failed to save student", error);
    return generic;
  }
}

/* ---------- Monthly fees ---------- */

export type FeesResult =
  | { ok: true; students: Student[]; payments: FeePayment[]; masked: boolean; source: DataSource }
  | OfficeFailure;

export async function listOfficeFees(): Promise<FeesResult> {
  if (!(await requireStaff())) return unauthorized;
  try {
    const students = await listStudents();
    const payments = await listPayments(students);
    return { ok: true, students: students.map(forOffice), payments, masked: masked(), source: source() };
  } catch (error) {
    console.error("[office] failed to list fees", error);
    return generic;
  }
}

export async function recordOfficePayment(input: PaymentInput): Promise<{ ok: true; payment: FeePayment } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required", fields: officeFieldErrors(parsed.error) };
  const data = parsed.data;
  const months = [...new Set(data.months)].sort();

  try {
    const students = await listStudents();
    const student = students.find((s) => s.id === data.studentId);
    if (!student) return { ok: false, error: "notFound" };
    // Re-checked here in case another desk recorded the same month meanwhile.
    const paid = new Set(
      (await listPayments(students))
        .filter((p) => p.studentId === student.id && p.status === "Paid")
        .flatMap((p) => p.months),
    );
    if (months.some((m) => paid.has(m))) return { ok: false, error: "alreadyPaid", fields: { months: "alreadyPaid" } };

    const now = new Date();
    const payment: FeePayment = {
      receipt: newReceiptNo(now),
      paidAt: now.getTime(),
      studentId: student.id,
      studentName: student.name,
      courseId: student.courseId,
      batchId: student.batchId,
      courseName: student.courseName,
      batchName: student.batchName,
      months,
      amount: data.amount,
      method: data.method,
      note: data.note,
      recordedBy: user.name,
      status: "Paid",
      sample: student.sample,
    };
    await savePayment(payment);
    return { ok: true, payment };
  } catch (error) {
    console.error("[office] failed to record payment", error);
    return generic;
  }
}

export async function voidOfficePayment(receipt: string): Promise<{ ok: true } | OfficeFailure> {
  if (!(await requireStaff())) return unauthorized;
  if (typeof receipt !== "string" || !receipt || receipt.length > 40) return { ok: false, error: "notFound" };
  try {
    const payment = (await listPayments(await listStudents())).find((p) => p.receipt === receipt);
    if (!payment) return { ok: false, error: "notFound" };
    if (payment.status === "Void") return { ok: true };
    return (await voidPayment(payment)) ? { ok: true } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("[office] failed to void payment", error);
    return generic;
  }
}

/* ---------- Attendance ---------- */

export type AttendanceResult =
  | { ok: true; students: Student[]; sessions: AttendanceSession[]; source: DataSource }
  | OfficeFailure;

/** One batch's roster (everyone ever in it, active or not) and every class taken for it. */
export async function getOfficeAttendance(courseId: string, batchId: string): Promise<AttendanceResult> {
  if (!(await requireStaff())) return unauthorized;
  const course = typeof courseId === "string" ? getCourse(courseId) : undefined;
  if (!course || !course.batches.some((b) => b.id === batchId)) return { ok: false, error: "select" };
  try {
    const students = (await listStudents()).filter((s) => s.courseId === courseId && s.batchId === batchId);
    const sessions = await listSessions(courseId, batchId, students);
    return { ok: true, students: students.map(forOffice), sessions, source: source() };
  } catch (error) {
    console.error("[office] failed to load attendance", error);
    return generic;
  }
}

export async function saveOfficeAttendance(
  input: AttendanceInput,
): Promise<{ ok: true; session: AttendanceSession } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required", fields: officeFieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.date > dhakaDateKey(new Date())) return { ok: false, error: "date", fields: { date: "date" } };

  try {
    const students = (await listStudents()).filter((s) => s.courseId === data.courseId && s.batchId === data.batchId);
    // Anyone in the batch, plus anyone already marked in this class (they may have moved batch since).
    const before = (await listSessions(data.courseId, data.batchId, students)).find((s) => s.date === data.date);
    const allowed = new Set([...students.map((s) => s.id), ...Object.keys(before?.marks ?? {})]);
    if (Object.keys(data.marks).some((id) => !allowed.has(id))) return { ok: false, error: "notFound" };
    const session: AttendanceSession = { ...data, takenBy: user.name, updatedAt: Date.now() };
    await saveSession(session);
    return { ok: true, session };
  } catch (error) {
    console.error("[office] failed to save attendance", error);
    return generic;
  }
}
