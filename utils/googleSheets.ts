import { google, sheets_v4 } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

type SpreadsheetId = string;
type SheetName = string;

type CellValue = string | number | boolean | null;
export type RowData = Record<string, CellValue>;

type BaseOptions = {
  spreadsheetId?: SpreadsheetId;
  sheetName?: SheetName;
};

type ReadOptions = BaseOptions & {
  range?: string;
};

type WriteOptions = BaseOptions & {
  clearBeforeWrite?: boolean;
};

function getSpreadsheetIdOrThrow(spreadsheetId?: string): string {
  const id = spreadsheetId ?? process.env.SHEET_ID;
  if (!id) throw new Error("SHEET_ID required");
  return id;
}

async function getSheetsClient(
  scope:
    | "https://www.googleapis.com/auth/spreadsheets.readonly"
    | "https://www.googleapis.com/auth/spreadsheets"
): Promise<sheets_v4.Sheets> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: [scope],
  });

  return google.sheets({ version: "v4", auth });
}

async function ensureSheetExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

  const exists = spreadsheet.data.sheets?.some(
    (s) => s.properties?.title === sheetName
  );

  if (exists) return;

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("already exists")) {
      throw err;
    }
  }
}

function toValuesWithHeaders(rows: RowData[]) {
  if (rows.length === 0)
    return {
      headers: [] as string[],
      values: [] as (string | number | boolean)[][],
    };

  const headers = Object.keys(rows[0]);

  const values = rows.map((row) =>
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

  return { headers, values };
}

export async function readSheetValues(options: ReadOptions = {}) {
  const spreadsheetId = getSpreadsheetIdOrThrow(options.spreadsheetId);
  const sheetName = options.sheetName ?? "Sheet1";
  const range = options.range ?? "A:Z";

  const sheets = await getSheetsClient(
    "https://www.googleapis.com/auth/spreadsheets.readonly"
  );

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
  });

  return res.data.values ?? [];
}

export async function saveRowsToSheet(
  data: RowData[] | RowData,
  options: WriteOptions = {}
) {
  const spreadsheetId = getSpreadsheetIdOrThrow(options.spreadsheetId);
  const sheetName = options.sheetName ?? "Sheet1";
  const clearBeforeWrite = options.clearBeforeWrite ?? false;

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return { appended: 0 };

  const sheets = await getSheetsClient(
    "https://www.googleapis.com/auth/spreadsheets"
  );

  await ensureSheetExists(sheets, spreadsheetId, sheetName);

  const { headers, values } = toValuesWithHeaders(rows);

  if (headers.length === 0) return { appended: 0 };

  if (clearBeforeWrite) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers, ...values],
      },
    });

    return { cleared: true, written: values.length };
  }

  const headerCheck = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const existingHeaderLen = headerCheck.data.values?.[0]?.length ?? 0;
  const hasHeaders =
    existingHeaderLen === headers.length && existingHeaderLen > 0;

  const appendValues = hasHeaders ? values : [headers, ...values];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: appendValues,
    },
  });

  return { appended: values.length };
}
