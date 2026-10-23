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

  const range = encodeURIComponent(`${tab}!A1`);
  await sheets.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    method: "POST",
    data: { values: [row] },
  });
}
