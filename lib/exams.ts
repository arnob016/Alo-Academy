import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { site } from "@/config/site";
import { courseFromSheet, getCourse } from "@/content/courses";
import { exams as sampleExams, type Exam } from "@/content/results";
import { dhakaTimestamp, makeRef } from "./ref";
import { appendRow, findRow, readRange, sheetsConfigured, updateRange } from "./sheets";

/*
 * Exam results, entered from the office and kept in the "Results" tab: one row
 * per exam, with every score in one cell as "roll | name | marks" lines.
 * Same rules as notices (lib/notices.ts): deleting marks the row, the results
 * page reads a cached copy the office refreshes, demo accounts write to memory
 * only, and the samples in content/results.ts show in demo mode.
 */

export const RESULTS_TAG = "results";
export type ExamOrigin = "sheet" | "memory" | "sample";
export type ListedExam = Exam & { origin: ExamOrigin };

// Columns: ID | Date | Course | Title (Bangla) | Title (English) | Full Marks | Pass Marks | Scores | Updated | Deleted
const TAB = "Results";

function toRow(e: Exam, deleted = false) {
  return [
    e.id,
    e.date,
    getCourse(e.courseId)?.name.en ?? e.courseId,
    e.title.bn,
    e.title.en,
    e.fullMarks,
    e.passMarks,
    e.scores.map(([roll, name, marks]) => `${roll} | ${name} | ${marks}`).join("\n"),
    dhakaTimestamp(),
    deleted ? "yes" : "",
  ];
}

function parseScores(value: string): Exam["scores"] {
  return value.split(/\r?\n/).flatMap((line) => {
    const [roll = "", name = "", marks = ""] = line.split("|").map((part) => part.trim());
    const score = Number(marks);
    return roll && marks !== "" && Number.isFinite(score) ? [[roll, name, score] as [string, string, number]] : [];
  });
}

function fromRow(cells: string[]): Exam | null {
  const cell = (i: number) => (cells[i] ?? "").trim();
  if (!cell(0) || cell(9).toLowerCase() === "yes") return null;
  return {
    id: cell(0),
    date: /^\d{4}-\d{2}-\d{2}$/.test(cell(1)) ? cell(1) : "",
    courseId: courseFromSheet(cell(2), "").course?.id ?? "",
    title: { bn: cell(3), en: cell(4) },
    fullMarks: Number(cell(5)) || 0,
    passMarks: Number(cell(6)) || 0,
    scores: parseScores(cells[7] ?? ""),
  };
}

const memory = globalThis as typeof globalThis & { __aloExams?: Exam[] };
const localRows = () => (memory.__aloExams ??= []);

/** Newest first. */
export async function listExams(): Promise<ListedExam[]> {
  const sheet = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:J`)).map(fromRow).filter((e): e is Exam => e !== null)
    : [];
  return [
    ...sheet.map((e) => ({ ...e, origin: "sheet" as const })),
    ...localRows().map((e) => ({ ...e, origin: "memory" as const })),
    ...(site.demo.enabled ? sampleExams : []).map((e) => ({ ...e, origin: "sample" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));
}

/** Published results as the public sees them: exams with at least one score and a usable full mark. */
export async function getPublicExams(): Promise<Exam[]> {
  "use cache";
  cacheTag(RESULTS_TAG);
  try {
    const listed = await listExams();
    cacheLife("hours");
    return listed
      .filter((e) => e.scores.length > 0 && e.fullMarks > 0)
      .map((e) => ({
        id: e.id,
        courseId: e.courseId,
        title: e.title,
        date: e.date,
        fullMarks: e.fullMarks,
        passMarks: e.passMarks,
        scores: e.scores,
      }));
  } catch (error) {
    // Don't keep an empty results page for long because of one failed read.
    console.error("[results] failed to load", error);
    cacheLife("minutes");
    return [];
  }
}

export function newExamId(date = new Date()) {
  return makeRef(date, "EXM");
}

/** Adds an exam or replaces the one with the same ID; see saveNotice for `origin` and `inMemory`. */
export async function saveExam(exam: Exam, origin: Exclude<ExamOrigin, "sample"> | null, inMemory: boolean) {
  if (origin === "memory" || (origin === null && (inMemory || !sheetsConfigured()))) {
    if (!sheetsConfigured() && process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
    const rows = localRows();
    const index = rows.findIndex((e) => e.id === exam.id);
    if (index === -1) rows.push(exam);
    else rows[index] = exam;
    return;
  }
  const row = origin === "sheet" ? await findRow(TAB, "A", exam.id) : null;
  if (row) await updateRange(`${TAB}!A${row}:J${row}`, [toRow(exam)]);
  else await appendRow(TAB, toRow(exam));
}

export async function deleteExam(exam: ListedExam) {
  if (exam.origin === "memory") {
    const rows = localRows();
    const index = rows.findIndex((e) => e.id === exam.id);
    if (index !== -1) rows.splice(index, 1);
    return index !== -1;
  }
  if (exam.origin !== "sheet") return false;
  const row = await findRow(TAB, "A", exam.id);
  if (!row) return false;
  await updateRange(`${TAB}!A${row}:J${row}`, [toRow(exam, true)]);
  return true;
}
