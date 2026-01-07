import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

interface SaveOptions {
  spreadsheetId?: string;
  sheetName?: string;
  clearBeforeWrite?: boolean;
}

type RowData = Record<string, string | number | boolean | null>;

export async function saveToGoogleSheet(
  data: RowData[] | RowData,
  options: SaveOptions = {}
) {
  const {
    spreadsheetId = process.env.SHEET_ID,
    sheetName = "Sheet1",
    clearBeforeWrite = false,
  } = options;

  if (!spreadsheetId) throw new Error("SHEET_ID required");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title?.trim() === sheetName.trim()
  );

  if (!sheetExists) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      });
    } catch (err) {
      if (err instanceof Error && !err.message.includes("already exists"))
        throw err;
    }
  }

  const rowsArray = Array.isArray(data) ? data : [data];
  if (rowsArray.length === 0) return { appended: 0 };

  const headers = Object.keys(rowsArray[0]);

  const values: (string | number | boolean)[][] = rowsArray.map((row) =>
    headers.map((h) => {
      const v = row[h];
      if (
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
      ) {
        return v;
      }
      return "";
    })
  );

  if (clearBeforeWrite && sheetExists) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
  }

  const allValues: (string | number | boolean)[][] = [headers, ...values];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allValues },
  });

  return { success: true };
}
