import { NextResponse } from "next/server";
import { sheets_v4 } from "googleapis";
import { DateTime } from "luxon";

import { getSheetsClient } from "@/utils/googleSheets";
import { parseEvent } from "@/utils/parseEvent";

export const runtime = "nodejs";

const SHEET_NAME = process.env.VISIBLE_EVENTS_SHEET ?? "visibleEvents";

type VisibleEvent = {
  id: string;
  sections: string[];
};

type VisibleEventsPayload = {
  events: { id: string | number }[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isVisibleEventsPayload(v: unknown): v is VisibleEventsPayload {
  if (!isRecord(v)) return false;
  if (!("events" in v) || !Array.isArray(v.events)) return false;

  return v.events.every((e) => {
    if (!isRecord(e)) return false;
    return "id" in e && (typeof e.id === "string" || typeof e.id === "number");
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
  events: VisibleEvent[]
): Promise<void> {
  const maxSections = Math.max(0, ...events.map((e) => e.sections.length));

  const header = [
    "CompetitionId",
    ...Array.from({ length: maxSections }, (_, i) => `Section ${i + 1}`),
  ];

  const values: (string | number)[][] = [
    [""],
    [""],
    header,
    ...events.map((e) => [e.id, ...e.sections]),
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
      range: `${SHEET_NAME}!A4:Z`,
    });

    const rows = res.data.values ?? [];

    const events: VisibleEvent[] = rows
      .map((r) => ({
        id: normalizeId(r?.[0]),
        sections: (r?.slice(1) ?? []).filter(
          (v): v is string => typeof v === "string" && v.length > 0
        ),
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

    const now = DateTime.now().setZone("Europe/Kyiv");

    const events: VisibleEvent[] = [];

    for (const e of body.events) {
      const eventId = Number(e.id);
      if (!eventId) continue;

      const { rows } = await parseEvent(eventId);

      const sectionTimes = Array.from(
        new Set(rows.map((r) => r.SectionTime).filter(Boolean))
      ).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));

      if (sectionTimes.length === 0) {
        events.push({ id: normalizeId(e.id), sections: [] });
        continue;
      }

      const hasFuture = sectionTimes.some((s) => {
        const dt = DateTime.fromFormat(s, "yyyy:MM:dd HH:mm", {
          zone: "Europe/Kyiv",
        });
        return dt.isValid && dt >= now;
      });

      if (hasFuture) {
        events.push({ id: normalizeId(e.id), sections: sectionTimes });
      }
    }

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
