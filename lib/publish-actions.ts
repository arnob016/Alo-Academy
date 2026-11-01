"use server";

import { updateTag } from "next/cache";
import type { Notice } from "@/content/notices";
import type { Exam } from "@/content/results";
import { deleteExam, listExams, newExamId, RESULTS_TAG, saveExam, type ListedExam } from "./exams";
import { deleteNotice, listNotices, newNoticeId, NOTICES_TAG, saveNotice, type ListedNotice } from "./notices";
import type { DataSource, OfficeFailure } from "./office-actions";
import { examSchema, noticeSchema, officeFieldErrors, type ExamInput, type NoticeInput } from "./office-validation";
import { requireStaff } from "./session";
import { sheetsConfigured } from "./sheets";
import type { User } from "./users";

/*
 * Office: the public notice board and exam results. Staff only. Every change
 * refreshes the cached public page at once (updateTag). The demo staff login is
 * public, so what it posts stays in memory and it can't change what's in the
 * Sheet; samples can't be changed by anyone.
 */

/** Why the signed-in user can't change an item, or null if they can. */
export type Lock = "sample" | "demo" | null;

const lockFor = (origin: "sheet" | "memory" | "sample", user: User): Lock =>
  origin === "sample" ? "sample" : origin === "sheet" && user.demo ? "demo" : null;
const source = (): DataSource => (sheetsConfigured() ? "sheet" : "memory");

const unauthorized: OfficeFailure = { ok: false, error: "unauthorized" };
const generic: OfficeFailure = { ok: false, error: "generic" };

/* ---------- Notices ---------- */

export type OfficeNotice = ListedNotice & { lock: Lock };

export async function listOfficeNotices(): Promise<{ ok: true; notices: OfficeNotice[]; source: DataSource } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  try {
    const notices = (await listNotices()).map((n) => ({ ...n, lock: lockFor(n.origin, user) }));
    return { ok: true, notices, source: source() };
  } catch (error) {
    console.error("[office] failed to list notices", error);
    return generic;
  }
}

export async function saveOfficeNotice(input: NoticeInput): Promise<{ ok: true } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  const parsed = noticeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required", fields: officeFieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    const existing = data.id ? (await listNotices()).find((n) => n.id === data.id) : undefined;
    if (data.id && !existing) return { ok: false, error: "notFound" };
    const lock = existing ? lockFor(existing.origin, user) : null;
    if (lock) return { ok: false, error: lock };

    const notice: Notice = {
      id: existing?.id ?? newNoticeId(),
      date: data.date,
      tag: data.tag,
      pinned: data.pinned,
      title: { bn: data.titleBn, en: data.titleEn },
      body: { bn: data.bodyBn, en: data.bodyEn },
    };
    const origin = existing?.origin === "sheet" || existing?.origin === "memory" ? existing.origin : null;
    await saveNotice(notice, origin, Boolean(user.demo));
    updateTag(NOTICES_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[office] failed to save notice", error);
    return generic;
  }
}

export async function deleteOfficeNotice(id: string): Promise<{ ok: true } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  try {
    const notice = typeof id === "string" ? (await listNotices()).find((n) => n.id === id) : undefined;
    if (!notice) return { ok: false, error: "notFound" };
    const lock = lockFor(notice.origin, user);
    if (lock) return { ok: false, error: lock };
    if (!(await deleteNotice(notice))) return { ok: false, error: "notFound" };
    updateTag(NOTICES_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[office] failed to delete notice", error);
    return generic;
  }
}

/* ---------- Results ---------- */

export type OfficeExam = ListedExam & { lock: Lock };

export async function listOfficeExams(): Promise<{ ok: true; exams: OfficeExam[]; source: DataSource } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  try {
    const exams = (await listExams()).map((e) => ({ ...e, lock: lockFor(e.origin, user) }));
    return { ok: true, exams, source: source() };
  } catch (error) {
    console.error("[office] failed to list exams", error);
    return generic;
  }
}

export async function saveOfficeExam(input: ExamInput): Promise<{ ok: true; id: string } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  const parsed = examSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "required", fields: officeFieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    const existing = data.id ? (await listExams()).find((e) => e.id === data.id) : undefined;
    if (data.id && !existing) return { ok: false, error: "notFound" };
    const lock = existing ? lockFor(existing.origin, user) : null;
    if (lock) return { ok: false, error: lock };

    const exam: Exam = {
      id: existing?.id ?? newExamId(),
      courseId: data.courseId,
      title: { bn: data.titleBn, en: data.titleEn },
      date: data.date,
      fullMarks: data.fullMarks,
      passMarks: data.passMarks,
      scores: data.scores.map((s) => [s.roll, s.name, s.marks]),
    };
    const origin = existing?.origin === "sheet" || existing?.origin === "memory" ? existing.origin : null;
    await saveExam(exam, origin, Boolean(user.demo));
    updateTag(RESULTS_TAG);
    return { ok: true, id: exam.id };
  } catch (error) {
    console.error("[office] failed to save exam", error);
    return generic;
  }
}

export async function deleteOfficeExam(id: string): Promise<{ ok: true } | OfficeFailure> {
  const user = await requireStaff();
  if (!user) return unauthorized;
  try {
    const exam = typeof id === "string" ? (await listExams()).find((e) => e.id === id) : undefined;
    if (!exam) return { ok: false, error: "notFound" };
    const lock = lockFor(exam.origin, user);
    if (lock) return { ok: false, error: lock };
    if (!(await deleteExam(exam))) return { ok: false, error: "notFound" };
    updateTag(RESULTS_TAG);
    return { ok: true };
  } catch (error) {
    console.error("[office] failed to delete exam", error);
    return generic;
  }
}
