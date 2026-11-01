import "server-only";
import { site } from "@/config/site";
import { courses, type Level } from "@/content/courses";
import { dhakaTimestamp, makeRef } from "./ref";
import { appendRow, readRange, sheetsConfigured, updateRange } from "./sheets";

/*
 * Admissions storage. With Google credentials the private Sheet is the source
 * of truth; without them (local dev) submissions live in memory. In demo mode a
 * handful of sample applications are mixed in so the office dashboard and the
 * tracker have something to show on a fresh install. Samples are flagged and
 * never written to the Sheet.
 */

export const statuses = ["Pending", "Approved", "Rejected"] as const;
export type AdmissionStatus = (typeof statuses)[number];

export type Admission = {
  ref: string;
  /** Epoch ms. */
  submittedAt: number;
  studentName: string;
  level: Level | "";
  courseId: string;
  batchId: string;
  /** As stored in the Sheet (English), in case the course has since been renamed. */
  courseName: string;
  batchName: string;
  studentPhone: string;
  guardianPhone: string;
  method: string;
  senderNumber: string;
  amount: number;
  trxId: string;
  status: AdmissionStatus;
  notes: string;
  sample?: boolean;
};

// Columns: Timestamp | Ref No | Student Name | Class | Course | Batch | Student Phone |
// Guardian Phone | Method | Sender Number | Amount | TrxID | Status | Notes
const TAB = "Admissions";
const STATUS_COLUMN = "M";

function toRow(a: Admission) {
  return [
    dhakaTimestamp(new Date(a.submittedAt)),
    a.ref,
    a.studentName,
    a.level.toUpperCase(),
    a.courseName,
    a.batchName,
    a.studentPhone,
    a.guardianPhone,
    a.method,
    a.senderNumber,
    a.amount,
    a.trxId,
    a.status,
    a.notes,
  ];
}

/** "21/10/2026, 14:03:22" (Dhaka) → epoch ms. */
function parseTimestamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  const [d, mo, y, h, mi, s] = m.slice(1).map((part) => Number(part ?? 0));
  return Date.UTC(y, mo - 1, d, h - 6, mi, s);
}

function fromRow(cells: string[]): Admission {
  const cell = (i: number) => (cells[i] ?? "").trim();
  const course = courses.find((c) => c.name.en === cell(4));
  const batch = course?.batches.find((b) => b.label.en === cell(5));
  const status = statuses.find((s) => s.toLowerCase() === cell(12).toLowerCase()) ?? "Pending";
  return {
    ref: cell(1),
    submittedAt: parseTimestamp(cell(0)),
    studentName: cell(2),
    level: course?.level ?? "",
    courseId: course?.id ?? "",
    batchId: batch?.id ?? "",
    courseName: cell(4),
    batchName: cell(5),
    studentPhone: cell(6),
    guardianPhone: cell(7),
    method: cell(8),
    senderNumber: cell(9),
    // Keeps the decimal point, so a cell formatted as "1,000.00" reads as 1000, not 100000.
    amount: Number(cell(10).replace(/[^\d.]/g, "")) || 0,
    trxId: cell(11),
    status,
    notes: cell(13),
  };
}

// Survives hot reloads in dev. On serverless hosts it is per-instance, which
// only affects samples' statuses (real rows live in the Sheet).
const memory = globalThis as typeof globalThis & {
  __aloAdmissions?: Admission[];
  __aloSampleStatus?: Map<string, AdmissionStatus>;
};
const localRows = () => (memory.__aloAdmissions ??= []);
const sampleStatus = () => (memory.__aloSampleStatus ??= new Map());

// [name, courseId, batchId, hours ago, status, ref suffix]
const sampleSeed: [string, string, string, number, AdmissionStatus, string][] = [
  ["Nusrat Jahan", "hsc-science", "morning", 0.4, "Pending", "N7QK"],
  ["তানভীর আহমেদ", "ssc-science", "evening", 2, "Pending", "T4VD"],
  ["Ayesha Siddiqua", "medical", "morning", 5, "Pending", "A9XM"],
  ["Rafiul Islam", "varsity-science", "afternoon", 19, "Approved", "R2HP"],
  ["সাদিয়া আফরিন", "ssc-business", "evening", 27, "Approved", "S6LB"],
  ["Mehedi Hasan", "hsc-business", "evening", 44, "Rejected", "M3CW"],
  ["Farhana Akter", "varsity-science", "morning", 70, "Approved", "F8JT"],
  ["আরিফ হোসেন", "hsc-science", "evening", 96, "Approved", "K5ZR"],
];

function samples(now = Date.now()): Admission[] {
  return sampleSeed.map(([studentName, courseId, batchId, hoursAgo, status, suffix], i) => {
    const course = courses.find((c) => c.id === courseId)!;
    const batch = course.batches.find((b) => b.id === batchId)!;
    // Round to the hour so a sample's reference stays the same within a day.
    const submittedAt = Math.floor((now - hoursAgo * 3_600_000) / 3_600_000) * 3_600_000;
    const ref = `${makeRef(new Date(submittedAt)).slice(0, 10)}-${suffix}`;
    const phone = `017000${String(10 + i * 2).padStart(5, "0")}`;
    return {
      ref,
      submittedAt,
      studentName,
      level: course.level,
      courseId,
      batchId,
      courseName: course.name.en,
      batchName: batch.label.en,
      studentPhone: phone,
      guardianPhone: `017000${String(11 + i * 2).padStart(5, "0")}`,
      method: "bkash",
      senderNumber: phone,
      // One sample paid the wrong amount, so the dashboard's fee check has something to flag.
      amount: suffix === "M3CW" ? 500 : course.admissionFee,
      trxId: `DEMO${suffix}${String(i).padStart(2, "0")}`,
      status: sampleStatus().get(ref) ?? status,
      notes: "",
      sample: true,
    };
  });
}

export async function saveAdmission(admission: Admission) {
  if (sheetsConfigured()) return appendRow(TAB, toRow(admission));
  if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
  console.info(`[admissions] Sheets not configured — kept in memory:`, toRow(admission));
  localRows().unshift(admission);
}

/** Newest first. */
export async function listAdmissions(): Promise<Admission[]> {
  const stored = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:N`)).filter((cells) => cells[1]).map(fromRow)
    : localRows();
  const all = site.demo.enabled ? [...stored, ...samples()] : [...stored];
  return all.sort((a, b) => b.submittedAt - a.submittedAt);
}

export async function findAdmission(ref: string) {
  return (await listAdmissions()).find((a) => a.ref === ref);
}

/** Returns false if no application has this reference. */
export async function setAdmissionStatus(ref: string, status: AdmissionStatus) {
  if (site.demo.enabled && samples().some((s) => s.ref === ref)) {
    sampleStatus().set(ref, status);
    return true;
  }

  if (!sheetsConfigured()) {
    const row = localRows().find((a) => a.ref === ref);
    if (row) row.status = status;
    return Boolean(row);
  }

  // Look the row up fresh, so rows added meanwhile can't shift the target.
  const refs = await readRange(`${TAB}!B2:B`);
  const index = refs.findIndex((cells) => cells[0]?.trim() === ref);
  if (index === -1) return false;
  await updateRange(`${TAB}!${STATUS_COLUMN}${index + 2}`, [[status]]);
  return true;
}

/** Whether `ref` is one of the demo samples (which live in memory, never in the Sheet). */
export function isSampleRef(ref: string) {
  return site.demo.enabled && samples().some((s) => s.ref === ref);
}

/** A sample application to try the tracker with (demo mode only). */
export function sampleForTracking() {
  // Prefer one with the whole timeline filled in, but any will do if staff un-approved them all.
  const all = samples();
  const sample = all.find((s) => s.status === "Approved") ?? all[0];
  return sample ? { ref: sample.ref, phone: sample.guardianPhone } : null;
}

/** References the demo parent account starts with: a confirmed and a pending sample. */
export function demoParentRefs() {
  const all = samples();
  return [all.find((s) => s.status === "Approved"), all.find((s) => s.status === "Pending")]
    .filter((s): s is Admission => Boolean(s))
    .map((s) => s.ref);
}

/** "01712345678" → "017****5678". */
export const maskPhone = (phone: string) => phone.replace(/^(\d{3})\d+(\d{4})$/, "$1****$2");
/** "8N7A6D5K4Q" → "8N7A••••4Q". */
export const maskTrxId = (trxId: string) =>
  trxId.length > 6 ? `${trxId.slice(0, 4)}${"•".repeat(trxId.length - 6)}${trxId.slice(-2)}` : trxId;
