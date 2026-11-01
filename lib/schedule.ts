import type { Batch, Weekday } from "@/content/courses";

/*
 * Class-time maths in Dhaka time. Bangladesh is UTC+6 with no daylight saving,
 * so a fixed offset is exact. Pure functions: used by the routine (client),
 * the application tracker and the calendar export.
 */

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
/** Indexed by `Date#getUTCDay()` (0 = Sunday). */
const jsDays: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const icsDays: Record<Weekday, string> = { sat: "SA", sun: "SU", mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR" };

export type Slot = Batch["slot"];

/** How far ahead a trial class can be booked. */
export const TRIAL_WINDOW_DAYS = 14;

/** "08:30" → 510 */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Weekday and minutes since midnight, in Dhaka. */
export function dhakaClock(date = new Date()) {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MS);
  return { day: jsDays[shifted.getUTCDay()], minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

/** A Date at `minutes` past midnight Dhaka time, for formatting a slot's clock time. */
export function clockDate(minutes: number) {
  return new Date(Date.UTC(2026, 0, 3) - DHAKA_OFFSET_MS + minutes * MINUTE);
}

/** A Date that falls on `day` in Dhaka, for formatting weekday names. 3 Jan 2026 was a Saturday. */
export function weekdayDate(day: Weekday) {
  const offset = (jsDays.indexOf(day) + 1) % 7;
  return new Date(Date.UTC(2026, 0, 3 + offset, 6));
}

/** Start of the first class of `slot` that begins after `from`. */
export function nextClassStart(slot: Slot, from = new Date()) {
  const start = toMinutes(slot.start);
  const local = new Date(from.getTime() + DHAKA_OFFSET_MS);
  for (let add = 0; add <= 7; add++) {
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + add);
    if (!slot.days.includes(jsDays[new Date(midnight).getUTCDay()])) continue;
    const startsAt = midnight - DHAKA_OFFSET_MS + start * MINUTE;
    if (startsAt > from.getTime()) return new Date(startsAt);
  }
  return null;
}

/** The next `count` class starts of `slot` after `from`. */
export function upcomingClasses(slot: Slot, count: number, from = new Date()) {
  const starts: Date[] = [];
  let cursor = from;
  while (starts.length < count) {
    const next = nextClassStart(slot, cursor);
    if (!next) break;
    starts.push(next);
    cursor = next;
  }
  return starts;
}

/** Dhaka calendar date as "YYYY-MM-DD". */
export function dhakaDateKey(date: Date) {
  return new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Dhaka calendar month as "YYYY-MM". */
export function dhakaMonthKey(date = new Date()) {
  return dhakaDateKey(date).slice(0, 7);
}

/** "2026-11" + 3 → "2027-02". */
export function addMonths(month: string, count: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + count, 1)).toISOString().slice(0, 7);
}

/** Every month from `from` to `to` inclusive ("YYYY-MM"); empty if `to` is earlier. */
export function monthRange(from: string, to: string) {
  const months: string[] = [];
  // The cap only guards against a malformed key looping forever.
  for (let m = from; m <= to && months.length < 240; m = addMonths(m, 1)) months.push(m);
  return months;
}

/** The latest `count` class dates ("YYYY-MM-DD", newest first) of `slot` that have started by `now`. */
export function pastClassDates(slot: Slot, count: number, now = new Date(), lookBackDays = 120) {
  const dates: string[] = [];
  const [y, m, d] = dhakaDateKey(now).split("-").map(Number);
  for (let back = 0; back <= lookBackDays && dates.length < count; back++) {
    const key = new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10);
    const start = classStartOn(slot, key);
    if (start && start.getTime() <= now.getTime()) dates.push(key);
  }
  return dates;
}

/** Start of the class of `slot` on a Dhaka date ("YYYY-MM-DD"), or null if it has no class that day. */
export function classStartOn(slot: Slot, dateKey: string) {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const midnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(midnight) || dhakaDateKey(new Date(midnight - DHAKA_OFFSET_MS)) !== dateKey) return null;
  if (!slot.days.includes(jsDays[new Date(midnight).getUTCDay()])) return null;
  return new Date(midnight - DHAKA_OFFSET_MS + toMinutes(slot.start) * MINUTE);
}

/** Whether a class of `slot` is running at `date`. */
export function isInSession(slot: Slot, date = new Date()) {
  const { day, minutes } = dhakaClock(date);
  return slot.days.includes(day) && minutes >= toMinutes(slot.start) && minutes < toMinutes(slot.end);
}

const icsTime = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (value: string) => value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Splits a line into 75-octet pieces (RFC 5545 §3.1; Bangla is 3 bytes a letter), never inside a character. */
function icsFold(line: string) {
  const encoder = new TextEncoder();
  const pieces: string[] = [];
  let piece = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward their 75.
    if (size + bytes > (pieces.length ? 74 : 75)) {
      pieces.push(piece);
      piece = "";
      size = 0;
    }
    piece += char;
    size += bytes;
  }
  pieces.push(piece);
  return pieces.join("\r\n ");
}

/**
 * A calendar event (.ics) for one batch: weekly from the next class, or a
 * single class when `once` is given (e.g. a trial class). Times are written in
 * UTC; every class starts after 06:00 Dhaka, so the UTC weekday is the same.
 */
export function batchCalendar({
  uid,
  title,
  description,
  location,
  slot,
  once,
}: {
  uid: string;
  title: string;
  description: string;
  location: string;
  slot: Slot;
  once?: Date;
}) {
  const start = once ?? nextClassStart(slot) ?? new Date();
  const end = new Date(start.getTime() + (toMinutes(slot.end) - toMinutes(slot.start)) * MINUTE);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Alo Academy//Class routine//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(end)}`,
    ...(once ? [] : [`RRULE:FREQ=WEEKLY;BYDAY=${slot.days.map((d) => icsDays[d]).join(",")}`]),
    `SUMMARY:${icsText(title)}`,
    `DESCRIPTION:${icsText(description)}`,
    `LOCATION:${icsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(icsFold)
    .join("\r\n");
}
