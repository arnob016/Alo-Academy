import "server-only";
import { site } from "@/config/site";
import { courses } from "@/content/courses";
import { dhakaTimestamp, makeRef } from "./ref";
import { dhakaDateKey, upcomingClasses } from "./schedule";
import { appendRow, readRange, sheetsConfigured } from "./sheets";

/*
 * Free trial class bookings. Same storage rules as admissions: the "Trials"
 * tab of the private Sheet when configured, memory in local dev, plus a few
 * flagged samples in demo mode.
 */

export type Trial = {
  ref: string;
  /** Epoch ms. */
  bookedAt: number;
  studentName: string;
  guardianPhone: string;
  courseId: string;
  batchId: string;
  courseName: string;
  batchName: string;
  /** Epoch ms of the class start. */
  classAt: number;
  locale: string;
  sample?: boolean;
};

// Columns: Timestamp | Ref No | Student Name | Guardian Phone | Course | Batch | Class Date | Class Time | Language
const TAB = "Trials";

const clock = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

function toRow(t: Trial) {
  return [
    dhakaTimestamp(new Date(t.bookedAt)),
    t.ref,
    t.studentName,
    t.guardianPhone,
    t.courseName,
    t.batchName,
    dhakaDateKey(new Date(t.classAt)),
    clock(t.classAt),
    t.locale,
  ];
}

/** "2026-10-31" + "08:00" (Dhaka) → epoch ms, or 0. */
function parseClass(date: string, time: string) {
  const d = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{1,2}):(\d{2})/);
  if (!d || !t) return 0;
  return Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]) - 6, Number(t[2]));
}

/** "21/10/2026, 14:03:22" (Dhaka) → epoch ms, or 0. */
function parseTimestamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 6, Number(m[5])) : 0;
}

function fromRow(cells: string[]): Trial {
  const cell = (i: number) => (cells[i] ?? "").trim();
  const course = courses.find((c) => c.name.en === cell(4));
  const batch = course?.batches.find((b) => b.label.en === cell(5));
  return {
    ref: cell(1),
    bookedAt: parseTimestamp(cell(0)),
    studentName: cell(2),
    guardianPhone: cell(3),
    courseId: course?.id ?? "",
    batchId: batch?.id ?? "",
    courseName: cell(4),
    batchName: cell(5),
    classAt: parseClass(cell(6), cell(7)),
    locale: cell(8),
  };
}

const memory = globalThis as typeof globalThis & { __aloTrials?: Trial[] };
const localRows = () => (memory.__aloTrials ??= []);

// [name, courseId, batchId, which upcoming class (0 = next)]
const sampleSeed: [string, string, string, number][] = [
  ["Tasnim Rahman", "hsc-science", "morning", 0],
  ["মাহফুজ করিম", "ssc-science", "evening", 0],
  ["Shila Begum", "medical", "morning", 1],
];

function samples(now = Date.now()): Trial[] {
  return sampleSeed.flatMap(([studentName, courseId, batchId, nth], i) => {
    const course = courses.find((c) => c.id === courseId)!;
    const batch = course.batches.find((b) => b.id === batchId)!;
    const classAt = upcomingClasses(batch.slot, nth + 1, new Date(now))[nth]?.getTime();
    if (!classAt) return [];
    // Stable within a day, so the list doesn't reshuffle between polls.
    const bookedAt = Math.floor(now / 86_400_000) * 86_400_000 - (i + 1) * 3_600_000;
    return [
      {
        ref: `TRL-${dhakaDateKey(new Date(bookedAt)).slice(2).replace(/-/g, "")}-S${i + 2}MP`,
        bookedAt,
        studentName,
        guardianPhone: `017000${String(90 + i).padStart(5, "0")}`,
        courseId,
        batchId,
        courseName: course.name.en,
        batchName: batch.label.en,
        classAt,
        locale: i === 1 ? "bn" : "en",
        sample: true,
      },
    ];
  });
}

export function newTrialRef(date = new Date()) {
  return makeRef(date, "TRL");
}

export async function saveTrial(trial: Trial) {
  if (sheetsConfigured()) return appendRow(TAB, toRow(trial));
  if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
  console.info(`[trials] Sheets not configured — kept in memory:`, toRow(trial));
  localRows().push(trial);
}

export async function listAllTrials(now = Date.now()) {
  const stored = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:I`)).filter((cells) => cells[1]).map(fromRow)
    : localRows();
  return site.demo.enabled ? [...stored, ...samples(now)] : [...stored];
}

/** Bookings from the start of today (Dhaka) onwards, soonest first. */
export async function listUpcomingTrials(): Promise<Trial[]> {
  const now = Date.now();
  const todayStart = Date.parse(`${dhakaDateKey(new Date(now))}T00:00:00+06:00`);
  return (await listAllTrials(now)).filter((t) => t.classAt >= todayStart).sort((a, b) => a.classAt - b.classAt);
}

export async function findTrial(ref: string) {
  return (await listAllTrials()).find((t) => t.ref === ref);
}

/** The sample booking the demo parent account starts with. */
export function demoParentTrialRef() {
  return samples()[0]?.ref ?? null;
}
