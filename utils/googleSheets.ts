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
  title?: string;
};

function getSpreadsheetIdOrThrow(spreadsheetId?: string): string {
  const resolvedId = spreadsheetId ?? process.env.SHEET_ID;
  if (!resolvedId) throw new Error("SHEET_ID required");
  return resolvedId;
}

async function getSheetsClient(
  scope:
    | "https://www.googleapis.com/auth/spreadsheets.readonly"
    | "https://www.googleapis.com/auth/spreadsheets"
): Promise<sheets_v4.Sheets> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [scope],
  });

  return google.sheets({ version: "v4", auth });
}

async function getSheetMeta(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<{ exists: boolean; sheetId: number | null }> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const found =
    spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName) ??
    null;

  const sheetId =
    typeof found?.properties?.sheetId === "number"
      ? found.properties.sheetId
      : null;

  return { exists: Boolean(found), sheetId };
}

async function ensureSheetExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<{ created: boolean; sheetId: number }> {
  const meta = await getSheetMeta(sheets, spreadsheetId, sheetName);
  if (meta.exists && meta.sheetId !== null) {
    return { created: false, sheetId: meta.sheetId };
  }

  try {
    const resp = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });

    const reply = resp.data.replies?.[0]?.addSheet?.properties;
    const sheetId = reply?.sheetId;

    if (typeof sheetId !== "number") {
      const meta2 = await getSheetMeta(sheets, spreadsheetId, sheetName);
      if (meta2.sheetId === null) {
        throw new Error("Failed to resolve created sheetId");
      }
      return { created: true, sheetId: meta2.sheetId };
    }

    return { created: true, sheetId };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("already exists")
    ) {
      const meta2 = await getSheetMeta(sheets, spreadsheetId, sheetName);
      if (meta2.sheetId === null) {
        throw new Error("Sheet exists but sheetId not found");
      }
      return { created: false, sheetId: meta2.sheetId };
    }
    throw error;
  }
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (!it) continue;
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function toValuesWithHeaders(rows: RowData[]) {
  if (rows.length === 0) {
    return {
      headers: [] as string[],
      values: [] as (string | number | boolean)[][],
    };
  }

  const preferredOrder = [
    "Time",
    "DancerName",
    "Category",
    "Program",
    "RegNumber",
    "DancingClub",
    "City",
    "Phone",
    "OrderType",
  ];

  const allKeys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) allKeys.push(key);
  }
  const unionKeys = uniquePreserveOrder(allKeys);

  const headersFromPreferred = preferredOrder.filter((h) =>
    unionKeys.includes(h)
  );
  const rest = unionKeys.filter((k) => !headersFromPreferred.includes(k));
  const headers = [...headersFromPreferred, ...rest];

  const values = rows.map((row) =>
    headers.map((header) => {
      const cellValue = row[header];
      if (
        typeof cellValue === "string" ||
        typeof cellValue === "number" ||
        typeof cellValue === "boolean"
      ) {
        return cellValue;
      }
      return "";
    })
  );

  return { headers, values };
}

async function writeCanonicalLayout(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  title?: string,
  dataValues?: (string | number | boolean)[][]
): Promise<void> {
  const trimmedTitle = (title ?? "").trim();

  const values: (string | number | boolean)[][] = [
    [trimmedTitle],
    [""],
    headers,
    ...(dataValues ?? []),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

async function setupCanonicalSheetLayout(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetId: number;
}) {
  const { sheets, spreadsheetId, sheetId } = params;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 3,
              },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: 3,
              startColumnIndex: 0,
              endColumnIndex: 26,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    },
  });
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
  const title = options.title;

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return { written: 0, appended: 0 };

  const sheets = await getSheetsClient(
    "https://www.googleapis.com/auth/spreadsheets"
  );

  const { headers, values } = toValuesWithHeaders(rows);
  if (headers.length === 0) return { written: 0, appended: 0 };

  const { created, sheetId } = await ensureSheetExists(
    sheets,
    spreadsheetId,
    sheetName
  );

  if (clearBeforeWrite) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    await writeCanonicalLayout(
      sheets,
      spreadsheetId,
      sheetName,
      headers,
      title,
      values
    );

    await setupCanonicalSheetLayout({ sheets, spreadsheetId, sheetId });

    return { cleared: true, written: values.length };
  }

  if (created) {
    await writeCanonicalLayout(
      sheets,
      spreadsheetId,
      sheetName,
      headers,
      title,
      values
    );

    await setupCanonicalSheetLayout({ sheets, spreadsheetId, sheetId });

    return { created: true, appended: values.length };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A4:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { appended: values.length };
}
