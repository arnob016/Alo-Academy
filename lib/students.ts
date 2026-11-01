import "server-only";
import { site } from "@/config/site";
import { courseFromSheet, courses, getCourse } from "@/content/courses";
import { isSampleRef, listAdmissions } from "./admissions";
import type { StudentStatus } from "./office-constants";
import { dhakaTimestamp, REF_PATTERN } from "./ref";
import { addMonths, dhakaDateKey, dhakaMonthKey } from "./schedule";
import { appendRow, findRow, readRange, sheetsConfigured, updateRange } from "./sheets";

/*
 * The enrolled-student roster. Every approved admission is a student
 * automatically (its ID is the admission reference); staff can also add
 * students who enrolled at the office. The "Students" tab holds what the office
 * adds on top: roll number, batch moves, status and notes. A row keyed by an
 * admission reference only counts while that admission is approved, so
 * "Undo" on the admissions page takes the student off the roster again.
 * Same storage rules as admissions: the Sheet when configured, memory in local
 * dev, plus flagged samples in demo mode (edited in memory only).
 */

/** What the "Students" tab stores for one student. */
export type StudentRecord = {
  id: string;
  roll: string;
  name: string;
  courseId: string;
  batchId: string;
  /** As stored in the Sheet (English), in case the course has since been renamed. */
  courseName: string;
  batchName: string;
  studentPhone: string;
  guardianPhone: string;
  /** Dhaka date "YYYY-MM-DD"; monthly fees are due from this month. */
  joined: string;
  status: StudentStatus;
  notes: string;
};

export type Student = StudentRecord & {
  /** "admission": an approved online admission (ID = its reference). "office": added by staff. */
  source: "admission" | "office";
  sample?: boolean;
};

// Columns: Student ID | Roll | Name | Course | Batch | Student Phone | Guardian Phone | Joined | Status | Notes | Updated
const TAB = "Students";

function toRow(s: StudentRecord) {
  return [
    s.id,
    s.roll,
    s.name,
    s.courseName,
    s.batchName,
    s.studentPhone,
    s.guardianPhone,
    s.joined,
    s.status,
    s.notes,
    dhakaTimestamp(),
  ];
}

function fromRow(cells: string[]): StudentRecord {
  const cell = (i: number) => (cells[i] ?? "").trim();
  const { course, batch } = courseFromSheet(cell(3), cell(4));
  return {
    id: cell(0),
    roll: cell(1),
    name: cell(2),
    courseId: course?.id ?? "",
    batchId: batch?.id ?? "",
    courseName: cell(3),
    batchName: cell(4),
    studentPhone: cell(5),
    guardianPhone: cell(6),
    joined: /^\d{4}-\d{2}-\d{2}$/.test(cell(7)) ? cell(7) : "",
    status: cell(8).toLowerCase() === "left" ? "Left" : "Active",
    notes: cell(9),
  };
}

const memory = globalThis as typeof globalThis & {
  __aloStudents?: StudentRecord[];
  __aloSampleStudents?: Map<string, StudentRecord>;
};
const localRows = () => (memory.__aloStudents ??= []);
const sampleEdits = () => (memory.__aloSampleStudents ??= new Map());

// [id suffix, roll, name, courseId, batchId, joined how many months ago]
// Rolls and names match the sample exam results.
const sampleSeed: [string, string, string, string, string, number][] = [
  ["01", "1201", "Rahat Karim", "ssc-science", "morning", 3],
  ["02", "1204", "Sumaiya Islam", "ssc-science", "morning", 3],
  ["03", "1206", "Mim Akter", "ssc-science", "morning", 1],
  ["04", "1209", "Tahmid Rahman", "ssc-science", "evening", 2],
  ["05", "1212", "নাফিসা তাবাসসুম", "ssc-science", "evening", 0],
  ["06", "2104", "Zubair Alam", "hsc-science", "morning", 4],
  ["07", "2105", "Nabila Rahman", "hsc-science", "morning", 2],
  ["08", "2112", "সামিয়া ইসলাম", "hsc-science", "morning", 1],
  ["09", "2110", "Priya Roy", "hsc-science", "evening", 3],
  ["10", "3104", "Ehsan Kabir", "varsity-science", "morning", 2],
  ["11", "3106", "Anika Tabassum", "varsity-science", "morning", 1],
  ["12", "3107", "Ridwan Hossain", "varsity-science", "afternoon", 2],
  ["13", "4101", "Nadia Islam", "medical", "morning", 1],
  ["14", "1301", "Rupa Akter", "ssc-business", "evening", 2],
  ["15", "2301", "Sajid Khan", "hsc-business", "evening", 3],
];
const SAMPLE_PREFIX = "STU-SAMPLE-";

function sampleStudents(now = new Date()): Student[] {
  return sampleSeed.map(([suffix, roll, name, courseId, batchId, monthsAgo], i) => {
    const course = getCourse(courseId)!;
    const batch = course.batches.find((b) => b.id === batchId)!;
    const id = `${SAMPLE_PREFIX}${suffix}`;
    const base: StudentRecord = {
      id,
      roll,
      name,
      courseId,
      batchId,
      courseName: course.name.en,
      batchName: batch.label.en,
      studentPhone: `017100${String(10 + i * 2).padStart(5, "0")}`,
      guardianPhone: `017100${String(11 + i * 2).padStart(5, "0")}`,
      joined: `${addMonths(dhakaMonthKey(now), -monthsAgo)}-0${(i % 5) + 1}`,
      status: "Active",
      notes: "",
    };
    return { ...(sampleEdits().get(id) ?? base), source: "office", sample: true };
  });
}

/** Whether a student lives in memory as a demo sample (never written to the Sheet). */
export function isSampleStudent(id: string) {
  return site.demo.enabled && (id.startsWith(SAMPLE_PREFIX) || isSampleRef(id));
}

async function storedStudents(): Promise<StudentRecord[]> {
  if (!sheetsConfigured()) return localRows();
  return (await readRange(`${TAB}!A2:K`)).filter((cells) => cells[0]?.trim()).map(fromRow);
}

const courseOrder = (id: string) => {
  const index = courses.findIndex((c) => c.id === id);
  return index === -1 ? courses.length : index;
};
const batchOrder = (courseId: string, batchId: string) =>
  getCourse(courseId)?.batches.findIndex((b) => b.id === batchId) ?? 0;
/** Numeric rolls in order, then any others, then students without a roll. */
const rollKey = (roll: string) => (roll ? (/^\d+$/.test(roll) ? Number(roll) : Number.MAX_SAFE_INTEGER - 1) : Number.MAX_SAFE_INTEGER);

/** Everyone on the roster (active and left), by course, batch and roll. */
export async function listStudents(): Promise<Student[]> {
  const [admissions, stored] = await Promise.all([listAdmissions(), storedStudents()]);
  const saved = new Map(stored.map((s) => [s.id, s]));

  const enrolled: Student[] = admissions
    .filter((a) => a.status === "Approved")
    .map((a) => {
      const base: StudentRecord = {
        id: a.ref,
        roll: "",
        name: a.studentName,
        courseId: a.courseId,
        batchId: a.batchId,
        courseName: a.courseName,
        batchName: a.batchName,
        studentPhone: a.studentPhone,
        guardianPhone: a.guardianPhone,
        joined: a.submittedAt ? dhakaDateKey(new Date(a.submittedAt)) : "",
        status: "Active",
        notes: "",
      };
      const edits = a.sample ? sampleEdits().get(a.ref) : saved.get(a.ref);
      return { ...(edits ?? base), source: "admission", sample: a.sample };
    });
  const office: Student[] = stored
    .filter((s) => !REF_PATTERN.test(s.id))
    .map((s) => ({ ...s, source: "office" }));
  const all = [...enrolled, ...office, ...(site.demo.enabled ? sampleStudents() : [])];

  return all.sort(
    (a, b) =>
      courseOrder(a.courseId) - courseOrder(b.courseId) ||
      batchOrder(a.courseId, a.batchId) - batchOrder(b.courseId, b.batchId) ||
      rollKey(a.roll) - rollKey(b.roll) ||
      a.roll.localeCompare(b.roll) ||
      a.name.localeCompare(b.name),
  );
}

/** Adds or updates a student's row. */
export async function saveStudent(student: StudentRecord) {
  if (isSampleStudent(student.id)) {
    sampleEdits().set(student.id, student);
    return;
  }
  if (!sheetsConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
    const rows = localRows();
    const index = rows.findIndex((s) => s.id === student.id);
    if (index === -1) rows.push(student);
    else rows[index] = student;
    return;
  }
  const row = await findRow(TAB, "A", student.id);
  if (row) await updateRange(`${TAB}!A${row}:K${row}`, [toRow(student)]);
  else await appendRow(TAB, toRow(student));
}
