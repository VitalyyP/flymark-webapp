import { NextResponse } from "next/server";
import { saveRowsToSheet, RowData } from "@/utils/googleSheets";
import { normalizeTimeUniversal } from "@/utils/normalizeTime";

type FormItem = {
  category: string;
  program: string;
  time: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function parseFormItem(value: unknown): FormItem | null {
  if (!isRecord(value)) return null;

  const category = toTrimmedString(value.category ?? value.Category);
  const program = toTrimmedString(value.program ?? value.Program);
  const time = toTrimmedString(value.time ?? value.Time);

  if (!category || !program || !time) return null;

  return { category, program, time };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const eventId = toTrimmedString(
      body.eventId ?? body.eventID ?? body.EventId
    );
    const eventName = toTrimmedString(body.eventName ?? body.EventName);
    const eventDate = toTrimmedString(body.eventDate ?? body.EventDate);
    const dancerName = toTrimmedString(
      body.name ?? body.DancerName ?? body.dancerName
    );

    const itemsRaw = body.items ?? body.Items;

    if (!eventId || !dancerName || !Array.isArray(itemsRaw)) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: {
            hasEventId: Boolean(eventId),
            hasName: Boolean(dancerName),
            itemsIsArray: Array.isArray(itemsRaw),
          },
        },
        { status: 400 }
      );
    }

    const items: FormItem[] = itemsRaw
      .map(parseFormItem)
      .filter((item): item is FormItem => item !== null);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload", details: { reason: "No valid items" } },
        { status: 400 }
      );
    }

    const regNumber = toTrimmedString(body.regNumber ?? body.RegNumber);
    const orderType = toTrimmedString(body.orderType ?? body.OrderType);
    const phone = toTrimmedString(body.phone ?? body.Phone);
    const club = toTrimmedString(
      body.club ?? body.Club ?? body.dancingClub ?? body.DancingClub
    );
    const city = toTrimmedString(body.city ?? body.City);

    const rows: RowData[] = items.map((item) => ({
      DancerName: dancerName,
      Category: item.category,
      Program: item.program,
      Time: normalizeTimeUniversal(item.time),
      RegNumber: regNumber,
      OrderType: orderType,
      Phone: phone,
      DancingClub: club,
      City: city,
    }));

    await saveRowsToSheet(rows, {
      sheetName: `${eventId}/B`,
      clearBeforeWrite: false,
      title: eventName || undefined,
      subtitle: eventDate || undefined,
    });

    return NextResponse.json({ success: true, written: rows.length });
  } catch (error: unknown) {
    console.error("SAVE_FORM_ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
