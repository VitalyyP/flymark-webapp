import { NextResponse } from "next/server";
import { sheets_v4 } from "googleapis";

import { getSheetsClient } from "@/utils/googleSheets";

export const runtime = "nodejs";

const SHEET_NAME = process.env.VISIBLE_EVENTS_SHEET ?? "visibleEvents";

type VisibleEventsPayload = {
  ids: Array<string | number>;
};

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
    const { sheets, spreadsheetId: defaultId } = await getSheetsClient("write");
    const spreadsheetId = process.env.SHEET_ID ?? defaultId;

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

    const { sheets, spreadsheetId: defaultId } = await getSheetsClient("write");
    const spreadsheetId = process.env.SHEET_ID ?? defaultId;

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
