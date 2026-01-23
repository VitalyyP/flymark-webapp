import { NextResponse } from "next/server";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";
import { readFromGoogleSheet } from "@/utils/readFromGoogleSheet";

const SHEET_NAME = process.env.VISIBLE_EVENTS_SHEET ?? "visibleEvents";

type VisibleEventsPayload = {
  ids: Array<string | number>;
};

export async function GET() {
  try {
    const rows = await readFromGoogleSheet({
      sheetName: SHEET_NAME,
      range: "A:A",
    });

    const ids: string[] = rows
      .slice(1) // пропускаємо заголовок
      .map((row) => String(row?.[0] ?? "").trim())
      .filter((v) => v.length > 0);

    return NextResponse.json({ ids });
  } catch (error) {
    console.error("GET /api/visible-events error:", error);
    return NextResponse.json({ ids: [] }, { status: 200 });
  }
}

export async function PUT(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("ids" in body) ||
      !Array.isArray((body as { ids: unknown }).ids)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload" },
        { status: 400 }
      );
    }

    const payload = body as VisibleEventsPayload;

    const ids: string[] = payload.ids
      .map((value) => {
        if (typeof value === "string") return value.trim();
        if (typeof value === "number") return String(value);
        return "";
      })
      .filter((v) => v.length > 0);

    const rows = ids.map((CompetitionId) => ({ CompetitionId }));

    await saveToGoogleSheet(rows, {
      sheetName: SHEET_NAME,
      clearBeforeWrite: true,
    });

    return NextResponse.json({ ok: true, ids });
  } catch (error) {
    console.error("PUT /api/visible-events error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
