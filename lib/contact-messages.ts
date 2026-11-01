import "server-only";
import { createHmac } from "node:crypto";
import { site } from "@/config/site";
import { dhakaTimestamp } from "./ref";
import { authSecret } from "./session-token";
import { appendRow, readRange, sheetsConfigured, updateRange } from "./sheets";

/*
 * Messages from the contact form ("Contact" tab). Rows have no ID column, so a
 * message is identified by a keyed hash of its timestamp and phone (the phone
 * itself must not leak where it's masked), and looked up fresh before it's
 * marked handled. Same storage rules as admissions: memory in local dev, plus a
 * few flagged samples in demo mode.
 */

export type ContactMessage = {
  /** Keyed hash of the timestamp cell and phone. */
  id: string;
  /** Epoch ms. */
  receivedAt: number;
  name: string;
  phone: string;
  message: string;
  locale: string;
  handled: boolean;
  sample?: boolean;
};

// Columns: Timestamp | Name | Phone | Message | Language | Status
const TAB = "Contact";
const STATUS_COLUMN = "F";

function parseTimestamp(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return m ? Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]) - 6, Number(m[5]), Number(m[6] ?? 0)) : 0;
}

// Keyed with the server secret: a plain hash of a known timestamp would let anyone
// try every phone number (there are under a billion) and unmask it from the ID.
const idOf = (timestamp: string, phone: string) =>
  createHmac("sha256", authSecret()).update(`${timestamp.trim()}|${phone.trim()}`).digest("hex").slice(0, 16);

function fromRow(cells: string[]): ContactMessage {
  const cell = (i: number) => (cells[i] ?? "").trim();
  return {
    id: idOf(cell(0), cell(2)),
    receivedAt: parseTimestamp(cell(0)),
    name: cell(1),
    phone: cell(2),
    message: cell(3),
    locale: cell(4),
    handled: cell(5).toLowerCase() === "handled",
  };
}

const memory = globalThis as typeof globalThis & {
  __aloContact?: ContactMessage[];
  __aloSampleContact?: Map<string, boolean>;
};
const localRows = () => (memory.__aloContact ??= []);
const sampleHandled = () => (memory.__aloSampleContact ??= new Map());

// [name, phone, message, hours ago, language, handled]
const sampleSeed: [string, string, string, number, string, boolean][] = [
  ["Shahana Parvin", "01700000071", "আমার মেয়ে ক্লাস নাইনে পড়ে। সকাল ব্যাচে আসন খালি আছে কি? ফি কিস্তিতে দেওয়া যাবে?", 3, "bn", false],
  ["Rezaul Karim", "01700000072", "Is there a sibling discount if both my sons join HSC Science?", 26, "en", false],
  ["মোস্তফা কামাল", "01700000073", "মেডিকেল ভর্তি প্রস্তুতির ক্লাস কবে থেকে শুরু হবে জানাবেন।", 72, "bn", true],
];

function samples(now = Date.now()): ContactMessage[] {
  return sampleSeed.map(([name, phone, message, hoursAgo, locale, handled]) => {
    // Round to the hour so the ID stays the same between loads.
    const receivedAt = Math.floor((now - hoursAgo * 3_600_000) / 3_600_000) * 3_600_000;
    const id = idOf(dhakaTimestamp(new Date(receivedAt)), phone);
    return { id, receivedAt, name, phone, message, locale, handled: sampleHandled().get(id) ?? handled, sample: true };
  });
}

export async function saveContactMessage(message: Pick<ContactMessage, "name" | "phone" | "message" | "locale">) {
  const now = new Date();
  // Status is left blank: new messages are open.
  const row = [dhakaTimestamp(now), message.name, message.phone, message.message, message.locale];
  if (sheetsConfigured()) return appendRow(TAB, row);
  if (process.env.NODE_ENV === "production") throw new Error("Google Sheets is not configured");
  console.info(`[contact] Sheets not configured — kept in memory:`, row);
  localRows().push({ ...message, id: idOf(row[0], message.phone), receivedAt: now.getTime(), handled: false });
}

/** Newest first. */
export async function listContactMessages(): Promise<ContactMessage[]> {
  const stored = sheetsConfigured()
    ? (await readRange(`${TAB}!A2:F`)).filter((cells) => cells[0]?.trim()).map(fromRow)
    : localRows();
  const all = site.demo.enabled ? [...stored, ...samples()] : [...stored];
  return all.sort((a, b) => b.receivedAt - a.receivedAt);
}

/** Returns false if no message has this ID. */
export async function setMessageHandled(id: string, handled: boolean) {
  if (site.demo.enabled && samples().some((s) => s.id === id)) {
    sampleHandled().set(id, handled);
    return true;
  }
  if (!sheetsConfigured()) {
    const row = localRows().find((m) => m.id === id);
    if (row) row.handled = handled;
    return Boolean(row);
  }
  // Look the row up fresh, so rows added meanwhile can't shift the target.
  const keys = await readRange(`${TAB}!A2:C`);
  const index = keys.findIndex((cells) => idOf(cells[0] ?? "", cells[2] ?? "") === id);
  if (index === -1) return false;
  await updateRange(`${TAB}!${STATUS_COLUMN}${index + 2}`, [[handled ? "Handled" : ""]]);
  return true;
}
