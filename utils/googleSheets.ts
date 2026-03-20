import { google, sheets_v4 } from "googleapis";

function normalizePrivateKey(key?: string) {
  return key?.replace(/\\n/g, "\n");
}

type CellValue = string | number | boolean | null;
export type RowData = Record<string, CellValue>;

type Options = {
  spreadsheetId?: string;
  sheetName?: string;
  clearBeforeWrite?: boolean;
  title?: string;
  subtitle?: string;
};

type Scope = "read" | "write";

const clientsCache: Partial<
  Record<Scope, { sheets: sheets_v4.Sheets; spreadsheetId: string }>
> = {};

export async function getSheetsClient(
  scope: Scope = "write"
): Promise<{ sheets: sheets_v4.Sheets; spreadsheetId: string }> {
  if (clientsCache[scope]) {
    return clientsCache[scope]!;
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const spreadsheetId = process.env.SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets env");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: [
      scope === "read"
        ? "https://www.googleapis.com/auth/spreadsheets.readonly"
        : "https://www.googleapis.com/auth/spreadsheets",
    ],
  });

  const client = {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };

  clientsCache[scope] = client;

  return client;
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function toValues(rows: RowData[]) {
  if (!rows.length) return { headers: [], values: [] };

  const preferred = [
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

  const keys = unique(rows.flatMap((r) => Object.keys(r)));

  const headers = [
    ...preferred.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferred.includes(k)),
  ];

  const values = rows.map((row) =>
    headers.map((h) => {
      const v = row[h];
      return typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
        ? v
        : "";
    })
  );

  return { headers, values };
}

async function ensureSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const existing = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );

  if (existing?.properties?.sheetId) {
    return existing.properties.sheetId;
  }

  const resp = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });

  const sheetId = resp.data.replies?.[0]?.addSheet?.properties?.sheetId;

  if (typeof sheetId !== "number") {
    throw new Error("Failed to create sheet: sheetId missing in API response");
  }

  return sheetId;
}

async function setupLayout(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number
) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount: 3 },
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

async function writeLayout(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
  title?: string,
  subtitle?: string,
  values?: (string | number | boolean)[][]
) {
  const data = [[title ?? ""], [subtitle ?? ""], headers, ...(values ?? [])];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: data },
  });
}

export async function saveRowsToSheet(
  data: RowData[] | RowData,
  options: Options = {}
) {
  const sheetName = options.sheetName ?? "Sheet1";

  const rows = Array.isArray(data) ? data : [data];
  if (!rows.length) return;

  const { sheets, spreadsheetId: defaultId } = await getSheetsClient("write");
  const spreadsheetId = options.spreadsheetId ?? defaultId;

  const { headers, values } = toValues(rows);

  const sheetId = await ensureSheet(sheets, spreadsheetId, sheetName);

  if (options.clearBeforeWrite) {
    await writeLayout(
      sheets,
      spreadsheetId,
      sheetName,
      headers,
      options.title,
      options.subtitle,
      values
    );

    await setupLayout(sheets, spreadsheetId, sheetId);

    return { written: values.length };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A4`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { appended: values.length };
}
