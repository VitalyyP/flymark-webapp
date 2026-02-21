import { NextResponse } from "next/server";
import { google, sheets_v4 } from "googleapis";

export const runtime = "nodejs";

const SHEET_NAME = process.env.VISIBLE_EVENTS_SHEET ?? "visibleEvents";

type VisibleEventsPayload = {
  ids: Array<string | number>;
};

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function getSpreadsheetIdOrThrow(spreadsheetId?: string): string {
  const resolvedId = spreadsheetId ?? process.env.SHEET_ID;
  if (!resolvedId) throw new Error("SHEET_ID required");
  return resolvedId;
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isVisibleEventsPayload(v: unknown): v is VisibleEventsPayload {
  return isRecord(v) && Array.isArray(v.ids);
}

function normalizeId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

async function ensureSheetExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  const exists =
    spreadsheet.data.sheets?.some((s) => s.properties?.title === sheetName) ??
    false;

  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
}

async function clearWholeSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
}

async function writeWholeSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  ids: string[]
): Promise<void> {
  const values: (string | number | boolean)[][] = [
    [""], // A1 spacer
    [""], // A2 spacer
    ["CompetitionId"], // A3 header
    ...ids.map((id) => [id]), // A4+
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function GET() {
  try {
    const spreadsheetId = getSpreadsheetIdOrThrow();
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A4:A`,
    });

    const rows = res.data.values ?? [];

    const ids: string[] = rows
      .map((r) => normalizeId(r?.[0]))
      .filter((v) => v.length > 0 && v !== "CompetitionId");

    return NextResponse.json(
      { ids },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/visible-events error:", error);
    return NextResponse.json(
      { ids: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isVisibleEventsPayload(body)) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const ids: string[] = body.ids
      .map(normalizeId)
      .filter((v) => v.length > 0 && v !== "CompetitionId");

    const spreadsheetId = getSpreadsheetIdOrThrow();
    const sheets = await getSheetsClient();

    await ensureSheetExists(sheets, spreadsheetId, SHEET_NAME);

    await clearWholeSheet(sheets, spreadsheetId, SHEET_NAME);
    await writeWholeSheet(sheets, spreadsheetId, SHEET_NAME, ids);

    return NextResponse.json(
      { ok: true, ids },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("PUT /api/visible-events error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
