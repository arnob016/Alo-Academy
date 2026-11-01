import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { site } from "@/config/site";
import { noticeTags, notices as sampleNotices, type Notice } from "@/content/notices";
import { dhakaTimestamp, makeRef } from "./ref";
import { appendRow, findRow, readRange, sheetsConfigured, updateRange } from "./sheets";

/*
 * Notice board. Posted from the office and kept in the "Notices" tab; deleting
 * marks the row instead of removing it. The home page reads a cached copy that
 * the office refreshes on every change (and that expires hourly, so edits made
 * straight in the Sheet show up too).
 *
 * Memory holds notices when the Sheet isn't configured (local dev) and any
 * posted by a demo account: the demo staff login is public, so it must never
 * put text on the real Sheet. In demo mode the samples in content/notices.ts
 * are shown too; they can't be edited.
 */

export const NOTICES_TAG = "notices";
/** Where a notice lives, which decides who can change it. */
export type NoticeOrigin = "sheet" | "memory" | "sample";
export type ListedNotice = Notice & { origin: NoticeOrigin };

// Columns: ID | Date | Tag | Pinned | Title (Bangla) | Title (English) | Body (Bangla) | Body (English) | Updated | Deleted
const TAB = "Notices";

function toRow(n: Notice, deleted = false) {
  return [
    n.id,
    n.date,
    n.tag,
    n.pinned ? "yes" : "",
    n.title.bn,
    n.title.en,
    n.body.bn,
    n.body.en,
    dhakaTimestamp(),
    deleted ? "yes" : "",
  ];
}

function fromRow(cells: string[]): Notice | null {
  const cell = (i: number) => (cells[i] ?? "").trim();
  if (!cell(0) || cell(9).toLowerCase() === "yes") return null;
  return {
    id: cell(0),
    date: /^\d{4}-\d{2}-\d{2}$/.test(cell(1)) ? cell(1) : "",
    tag: noticeTags.find((t) => t === cell(2).toLowerCase()) ?? "batch",
    pinned: cell(3).toLowerCase() === "yes",
    title: { bn: cell(4), en: cell(5) },
    body: { bn: cell(6), en: cell(7) },
  };
}

const memory = globalThis as typeof globalThis & { __aloNotices?: Notice[] };
const localRows = () => (memory.__aloNotices ??= []);

/** Pinned first, then newest date first. */
const byPinnedThenDate = (a: Notice, b: Notice) =>
  Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.date.localeCompare(a.date);

export async function listNotices(): Promise<ListedNotice[]> {
  const sheet = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:J`)).map(fromRow).filter((n): n is Notice => n !== null)
    : [];
  return [
    ...sheet.map((n) => ({ ...n, origin: "sheet" as const })),
    ...localRows().map((n) => ({ ...n, origin: "memory" as const })),
    ...(site.demo.enabled ? sampleNotices : []).map((n) => ({ ...n, origin: "sample" as const })),
  ].sort(byPinnedThenDate);
}

/** The notice board as the public sees it. */
export async function getPublicNotices(): Promise<Notice[]> {
  "use cache";
  cacheTag(NOTICES_TAG);
  try {
    const listed = await listNotices();
    cacheLife("hours");
    return listed.map((n) => ({ id: n.id, date: n.date, tag: n.tag, pinned: n.pinned, title: n.title, body: n.body }));
  } catch (error) {
    // Don't keep an empty board for long because of one failed read.
    console.error("[notices] failed to load", error);
    cacheLife("minutes");
    return [];
  }
}

export function newNoticeId(date = new Date()) {
  return makeRef(date, "NTC");
}

/**
 * Adds a notice, or replaces the one with the same ID. `inMemory` keeps it out of
 * the Sheet (demo accounts); an existing notice stays where it already is.
 */
export async function saveNotice(notice: Notice, origin: Exclude<NoticeOrigin, "sample"> | null, inMemory: boolean) {
  if (origin === "memory" || (origin === null && (inMemory || !sheetsConfigured()))) {
    if (!sheetsConfigured() && process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
    const rows = localRows();
    const index = rows.findIndex((n) => n.id === notice.id);
    if (index === -1) rows.push(notice);
    else rows[index] = notice;
    return;
  }
  const row = origin === "sheet" ? await findRow(TAB, "A", notice.id) : null;
  if (row) await updateRange(`${TAB}!A${row}:J${row}`, [toRow(notice)]);
  else await appendRow(TAB, toRow(notice));
}

export async function deleteNotice(notice: ListedNotice) {
  if (notice.origin === "memory") {
    const rows = localRows();
    const index = rows.findIndex((n) => n.id === notice.id);
    if (index !== -1) rows.splice(index, 1);
    return index !== -1;
  }
  if (notice.origin !== "sheet") return false;
  const row = await findRow(TAB, "A", notice.id);
  if (!row) return false;
  await updateRange(`${TAB}!A${row}:J${row}`, [toRow(notice, true)]);
  return true;
}
