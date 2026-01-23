import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

interface ReadOptions {
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
}

export async function readFromGoogleSheet(options: ReadOptions = {}) {
  const {
    spreadsheetId = process.env.SHEET_ID,
    sheetName = "Sheet1",
    range = "A:Z",
  } = options;

  if (!spreadsheetId) throw new Error("SHEET_ID required");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
  });

  return res.data.values ?? [];
}
