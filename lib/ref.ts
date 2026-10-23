// No 0/O or 1/I so references are easy to read out over the phone.
// 32 characters, so `byte % 32` has no bias.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TIME_ZONE = "Asia/Dhaka";

export const REF_PATTERN = /^ALO-\d{6}-[A-Z2-9]{4}$/;

/** Reference number in the form ALO-YYMMDD-XXXX (Dhaka date). */
export function makeRef(date = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, "");
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => CHARS[b % 32]).join("");
  return `ALO-${ymd}-${suffix}`;
}

/** Human-readable Dhaka timestamp for the Sheet, e.g. "21/10/2026, 14:03:22". */
export function dhakaTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}
