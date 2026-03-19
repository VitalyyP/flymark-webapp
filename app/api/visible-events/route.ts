import { NextResponse } from "next/server";
import { sheets_v4 } from "googleapis";

import { getSheetsClient } from "@/utils/googleSheets";

export const runtime = "nodejs";

const SHEET_NAME = process.env.VISIBLE_EVENTS_SHEET ?? "visibleEvents";

type VisibleEvent = {
  id: string | number;
  date: string;
};

type VisibleEventsPayload = {
  events: VisibleEvent[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isVisibleEventsPayload(v: unknown): v is VisibleEventsPayload {
  if (!isRecord(v)) return false;

  if (!("events" in v) || !Array.isArray(v.events)) return false;

  return v.events.every((e) => {
    if (!isRecord(e)) return false;

    const hasValidId =
      "id" in e && (typeof e.id === "string" || typeof e.id === "number");

    const hasValidDate = "date" in e && typeof e.date === "string";

    return hasValidId && hasValidDate;
  });
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
  events: { id: string; date: string }[]
): Promise<void> {
  const values: (string | number | boolean)[][] = [
    ["", ""],
    ["", ""],
    ["CompetitionId", "Date"],
    ...events.map((e) => [e.id, e.date]),
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
      range: `${SHEET_NAME}!A4:B`,
    });

    const rows = res.data.values ?? [];

    const events = rows
      .map((r) => ({
        id: normalizeId(r?.[0]),
        date: typeof r?.[1] === "string" ? r[1] : "",
      }))
      .filter((e) => e.id.length > 0 && e.id !== "CompetitionId");

    return NextResponse.json(
      { events },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/visible-events error:", error);
    return NextResponse.json(
      { events: [] },
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

    const events = body.events
      .map((e) => ({
        id: normalizeId(e.id),
        date: e.date,
      }))
      .filter((e) => e.id.length > 0 && e.id !== "CompetitionId");

    const { sheets, spreadsheetId: defaultId } = await getSheetsClient("write");
    const spreadsheetId = process.env.SHEET_ID ?? defaultId;

    await ensureSheetExists(sheets, spreadsheetId, SHEET_NAME);
    await clearWholeSheet(sheets, spreadsheetId, SHEET_NAME);
    await writeWholeSheet(sheets, spreadsheetId, SHEET_NAME, events);

    return NextResponse.json(
      { ok: true, events },
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
