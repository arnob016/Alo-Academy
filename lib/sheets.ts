import "server-only";
import { JWT } from "google-auth-library";

let client: JWT | null = null;

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel and .env files store the key with literal "\n" sequences.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !process.env.GOOGLE_SHEET_ID) return null;

  client ??= new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return client;
}

export const sheetsConfigured = () => getClient() !== null;

const valuesUrl = (range: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${encodeURIComponent(range)}`;

/**
 * Appends one row to a tab of the private spreadsheet.
 * Values are written RAW so phone numbers keep their leading zero.
 */
export async function appendRow(tab: string, row: (string | number)[]) {
  const sheets = getClient();
  if (!sheets) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sheets] Not configured — would append to "${tab}":`, row);
      return;
    }
    throw new Error("Google Sheets is not configured");
  }

  await sheets.request({
    url: `${valuesUrl(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    method: "POST",
    data: { values: [row] },
  });
}

/** Reads a range (e.g. "Admissions!A2:N") as rows of display strings. */
export async function readRange(range: string): Promise<string[][]> {
  const sheets = getClient();
  if (!sheets) throw new Error("Google Sheets is not configured");
  const res = await sheets.request<{ values?: string[][] }>({ url: valuesUrl(range) });
  return res.data.values ?? [];
}

/** Overwrites a range (e.g. "Admissions!M5") with RAW values. */
export async function updateRange(range: string, rows: (string | number)[][]) {
  const sheets = getClient();
  if (!sheets) throw new Error("Google Sheets is not configured");
  await sheets.request({
    url: `${valuesUrl(range)}?valueInputOption=RAW`,
    method: "PUT",
    data: { values: rows },
  });
}

/**
 * Sheet row number (2 = first data row) of the first row whose cell in `column`
 * equals `value`, or null. Always read fresh, so rows added meanwhile can't shift the target.
 */
export async function findRow(tab: string, column: string, value: string) {
  const cells = await readRange(`${tab}!${column}2:${column}`);
  const index = cells.findIndex((row) => row[0]?.trim() === value);
  return index === -1 ? null : index + 2;
}
