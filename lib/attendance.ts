import "server-only";
import { site } from "@/config/site";
import { courseFromSheet, getCourse } from "@/content/courses";
import type { Mark } from "./office-constants";
import { dhakaTimestamp } from "./ref";
import { pastClassDates } from "./schedule";
import { appendRow, readRange, sheetsConfigured, updateRange } from "./sheets";
import { isSampleStudent, type Student } from "./students";

/*
 * Attendance, one row per class: the date and batch, then the IDs of who was
 * present, absent and late. Retaking a class overwrites its row. Marks for demo
 * sample students live in memory only (with a generated history), so a class
 * that mixes real and sample students writes only the real ones to the Sheet.
 */

export type AttendanceSession = {
  /** Dhaka date "YYYY-MM-DD". */
  date: string;
  courseId: string;
  batchId: string;
  /** Student ID → mark. Students left out weren't marked. */
  marks: Record<string, Mark>;
  takenBy: string;
  /** Epoch ms, or 0 if unknown. */
  updatedAt: number;
};

// Columns: Date | Course | Batch | Present | Absent | Late | Taken By | Updated
const TAB = "Attendance";
const SAMPLE_HISTORY = 8;

const ids = (cell: string | undefined) => (cell ?? "").split(/[\s,]+/).filter(Boolean);

function toRow(s: AttendanceSession) {
  const course = getCourse(s.courseId);
  const batch = course?.batches.find((b) => b.id === s.batchId);
  const who = (mark: Mark) =>
    Object.entries(s.marks)
      .filter(([, m]) => m === mark)
      .map(([id]) => id)
      .join(" ");
  return [
    s.date,
    course?.name.en ?? s.courseId,
    batch?.label.en ?? s.batchId,
    who("P"),
    who("A"),
    who("L"),
    s.takenBy,
    dhakaTimestamp(new Date(s.updatedAt)),
  ];
}

function parseTimestamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 6, Number(m[5])) : 0;
}

function fromRow(cells: string[]): AttendanceSession | null {
  const cell = (i: number) => (cells[i] ?? "").trim();
  const { course, batch } = courseFromSheet(cell(1), cell(2));
  if (!course || !batch || !/^\d{4}-\d{2}-\d{2}$/.test(cell(0))) return null;
  const sessionMarks: Record<string, Mark> = {};
  for (const id of ids(cells[3])) sessionMarks[id] = "P";
  for (const id of ids(cells[4])) sessionMarks[id] = "A";
  for (const id of ids(cells[5])) sessionMarks[id] = "L";
  return {
    date: cell(0),
    courseId: course.id,
    batchId: batch.id,
    marks: sessionMarks,
    takenBy: cell(6),
    updatedAt: parseTimestamp(cell(7)),
  };
}

type SampleSession = Pick<AttendanceSession, "marks" | "takenBy" | "updatedAt">;
const memory = globalThis as typeof globalThis & {
  __aloAttendance?: AttendanceSession[];
  __aloSampleAttendance?: Map<string, SampleSession>;
};
const localRows = () => (memory.__aloAttendance ??= []);
const sampleEdits = () => (memory.__aloSampleAttendance ??= new Map());
const keyOf = (s: Pick<AttendanceSession, "date" | "courseId" | "batchId">) => `${s.date}|${s.courseId}|${s.batchId}`;

/** A stable pseudo-random mark (mostly present) so the demo history looks real but doesn't change between loads. */
function sampleMark(id: string, date: string): Mark {
  let hash = 0;
  for (const c of `${id}${date}`) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const roll = hash % 10;
  return roll === 0 ? "A" : roll === 1 ? "L" : "P";
}

function sampleSessions(courseId: string, batchId: string, students: Student[]): Map<string, SampleSession> {
  const sessions = new Map<string, SampleSession>();
  if (!site.demo.enabled) return sessions;
  const batch = getCourse(courseId)?.batches.find((b) => b.id === batchId);
  const samples = students.filter((s) => s.sample && s.status === "Active");
  if (batch && samples.length) {
    for (const date of pastClassDates(batch.slot, SAMPLE_HISTORY)) {
      // Only classes since the student joined.
      const sessionMarks = Object.fromEntries(
        samples.filter((s) => !s.joined || s.joined <= date).map((s) => [s.id, sampleMark(s.id, date)]),
      );
      if (Object.keys(sessionMarks).length) {
        sessions.set(keyOf({ date, courseId, batchId }), { marks: sessionMarks, takenBy: "Office staff", updatedAt: 0 });
      }
    }
  }
  for (const [key, edit] of sampleEdits()) {
    if (key.endsWith(`|${courseId}|${batchId}`)) sessions.set(key, edit);
  }
  return sessions;
}

async function storedSessions(): Promise<AttendanceSession[]> {
  if (!sheetsConfigured()) return localRows();
  return (await readRange(`${TAB}!A2:H`)).map(fromRow).filter((s): s is AttendanceSession => s !== null);
}

/** Every class taken for one batch, newest first. `students` (the batch's roster) supplies the demo samples' history. */
export async function listSessions(courseId: string, batchId: string, students: Student[]): Promise<AttendanceSession[]> {
  const stored = (await storedSessions()).filter((s) => s.courseId === courseId && s.batchId === batchId);
  const byKey = new Map(stored.map((s) => [keyOf(s), { ...s, marks: { ...s.marks } }]));

  for (const [key, sample] of sampleSessions(courseId, batchId, students)) {
    const existing = byKey.get(key);
    if (existing) {
      existing.marks = { ...sample.marks, ...existing.marks };
      if (sample.updatedAt > existing.updatedAt) Object.assign(existing, { takenBy: sample.takenBy, updatedAt: sample.updatedAt });
    } else {
      const [date] = key.split("|");
      byKey.set(key, { date, courseId, batchId, ...sample, marks: { ...sample.marks } });
    }
  }
  return [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Saves one class, replacing whatever was recorded for that date and batch before. */
export async function saveSession(session: AttendanceSession) {
  const entries = Object.entries(session.marks);
  const real = Object.fromEntries(entries.filter(([id]) => !isSampleStudent(id)));
  if (site.demo.enabled) {
    const sample = Object.fromEntries(entries.filter(([id]) => isSampleStudent(id)));
    sampleEdits().set(keyOf(session), { marks: sample, takenBy: session.takenBy, updatedAt: session.updatedAt });
  }
  const realSession = { ...session, marks: real };

  if (!sheetsConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
    const rows = localRows();
    const index = rows.findIndex((s) => keyOf(s) === keyOf(session));
    if (index !== -1) rows[index] = realSession;
    else if (Object.keys(real).length) rows.push(realSession);
    return;
  }

  // Find the row fresh, so rows added meanwhile can't shift the target.
  const keys = await readRange(`${TAB}!A2:C`);
  const index = keys.findIndex((cells) => {
    const { course, batch } = courseFromSheet((cells[1] ?? "").trim(), (cells[2] ?? "").trim());
    return (cells[0] ?? "").trim() === session.date && course?.id === session.courseId && batch?.id === session.batchId;
  });
  if (index !== -1) {
    const row = index + 2;
    await updateRange(`${TAB}!A${row}:H${row}`, [toRow(realSession)]);
  } else if (Object.keys(real).length) {
    await appendRow(TAB, toRow(realSession));
  }
}
