import "server-only";
import { courseFromSheet, getCourse } from "@/content/courses";
import { feeMethods, type FeeMethod } from "./office-constants";
import { dhakaTimestamp, makeRef } from "./ref";
import { dhakaMonthKey, monthRange } from "./schedule";
import { appendRow, findRow, readRange, sheetsConfigured, updateRange } from "./sheets";
import { isSampleStudent, type Student } from "./students";

/*
 * Monthly fee payments. One row per payment (a payment can cover several
 * months); mistakes are voided, never deleted, so the "Fees" tab stays a
 * complete record of every receipt issued. Payments for demo sample students
 * live in memory only.
 */

export type PaymentStatus = "Paid" | "Void";

export type FeePayment = {
  receipt: string;
  /** Epoch ms. */
  paidAt: number;
  studentId: string;
  studentName: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  /** "YYYY-MM", oldest first. */
  months: string[];
  amount: number;
  method: FeeMethod;
  note: string;
  recordedBy: string;
  status: PaymentStatus;
  sample?: boolean;
};

// Columns: Timestamp | Receipt No | Student ID | Student Name | Course | Batch | Months | Amount | Method | Note | Recorded By | Status
const TAB = "Fees";
const STATUS_COLUMN = "L";

function toRow(p: FeePayment) {
  return [
    dhakaTimestamp(new Date(p.paidAt)),
    p.receipt,
    p.studentId,
    p.studentName,
    p.courseName,
    p.batchName,
    p.months.join(" "),
    p.amount,
    p.method,
    p.note,
    p.recordedBy,
    p.status,
  ];
}

/** "21/10/2026, 14:03:22" (Dhaka) → epoch ms, or 0. */
function parseTimestamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 6, Number(m[5]), Number(m[6] ?? 0)) : 0;
}

function fromRow(cells: string[]): FeePayment {
  const cell = (i: number) => (cells[i] ?? "").trim();
  const { course, batch } = courseFromSheet(cell(4), cell(5));
  return {
    paidAt: parseTimestamp(cell(0)),
    receipt: cell(1),
    studentId: cell(2),
    studentName: cell(3),
    courseId: course?.id ?? "",
    batchId: batch?.id ?? "",
    courseName: cell(4),
    batchName: cell(5),
    months: cell(6)
      .split(/[\s,]+/)
      .filter((m) => /^\d{4}-\d{2}$/.test(m))
      .sort(),
    amount: Number(cell(7).replace(/[^\d.]/g, "")) || 0,
    method: feeMethods.find((m) => m === cell(8).toLowerCase()) ?? "cash",
    note: cell(9),
    recordedBy: cell(10),
    status: cell(11).toLowerCase() === "void" ? "Void" : "Paid",
  };
}

const memory = globalThis as typeof globalThis & {
  __aloFees?: FeePayment[];
  __aloSampleFees?: FeePayment[];
  __aloVoidSampleFees?: Set<string>;
};
const localRows = () => (memory.__aloFees ??= []);
const sampleRecorded = () => (memory.__aloSampleFees ??= []);
const sampleVoided = () => (memory.__aloVoidSampleFees ??= new Set());

/**
 * Generated history for the demo sample students: every month since they
 * joined is paid except the latest one or two for some, so the dues list has
 * something to show.
 */
function samplePayments(students: Student[], now = new Date()): FeePayment[] {
  const current = dhakaMonthKey(now);
  return students
    .filter((s) => s.sample && s.joined)
    .flatMap((s, i) => {
      const course = getCourse(s.courseId);
      if (!course) return [];
      const owed = i % 3;
      const months = monthRange(s.joined.slice(0, 7), current);
      return months.slice(0, Math.max(0, months.length - owed)).map((month, j) => {
        const receipt = `RCT-S${s.id.slice(-4).replace(/[^A-Z0-9]/gi, "")}-${month.replace("-", "")}`;
        return {
          receipt,
          paidAt: Math.min(now.getTime(), Date.parse(`${month}-0${(j % 5) + 3}T11:00:00+06:00`)),
          studentId: s.id,
          studentName: s.name,
          courseId: s.courseId,
          batchId: s.batchId,
          courseName: s.courseName,
          batchName: s.batchName,
          months: [month],
          amount: course.monthlyFee,
          method: j % 2 ? "bkash" : "cash",
          note: "",
          recordedBy: "Office staff",
          status: sampleVoided().has(receipt) ? "Void" : "Paid",
          sample: true,
        } satisfies FeePayment;
      });
    });
}

/** Every payment, newest first. `students` supplies the demo samples' generated history. */
export async function listPayments(students: Student[]): Promise<FeePayment[]> {
  const stored = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:L`)).filter((cells) => cells[1]?.trim()).map(fromRow)
    : localRows();
  const samples: FeePayment[] = [
    ...samplePayments(students),
    ...sampleRecorded().map((p) => ({ ...p, status: sampleVoided().has(p.receipt) ? "Void" : p.status })),
  ];
  return [...stored, ...samples].sort((a, b) => b.paidAt - a.paidAt);
}

export function newReceiptNo(date = new Date()) {
  return makeRef(date, "RCT");
}

export async function savePayment(payment: FeePayment) {
  if (isSampleStudent(payment.studentId)) {
    sampleRecorded().push({ ...payment, sample: true });
    return;
  }
  if (sheetsConfigured()) return appendRow(TAB, toRow(payment));
  if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
  console.info(`[fees] Sheets not configured — kept in memory:`, toRow(payment));
  localRows().push(payment);
}

/** Marks a receipt void. Returns false if no payment has this receipt number. */
export async function voidPayment(payment: FeePayment) {
  if (payment.sample) {
    sampleVoided().add(payment.receipt);
    return true;
  }
  if (!sheetsConfigured()) {
    const row = localRows().find((p) => p.receipt === payment.receipt);
    if (row) row.status = "Void";
    return Boolean(row);
  }
  const row = await findRow(TAB, "B", payment.receipt);
  if (!row) return false;
  await updateRange(`${TAB}!${STATUS_COLUMN}${row}`, [["Void"]]);
  return true;
}
