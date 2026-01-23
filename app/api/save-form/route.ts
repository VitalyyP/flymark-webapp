import { NextResponse } from "next/server";
import { saveRowsToSheet, RowData } from "@/utils/googleSheets";

type FormItem = {
  category: string;
  program: string;
  time: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toTrimmedString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function parseFormItem(v: unknown): FormItem | null {
  if (!isRecord(v)) return null;

  const category = toTrimmedString(v.category ?? v.Category);
  const program = toTrimmedString(v.program ?? v.Program);
  const time = toTrimmedString(v.time ?? v.Time);

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
    const name = toTrimmedString(
      body.name ?? body.DancerName ?? body.dancerName
    );

    const itemsRaw = body.items ?? body.Items;

    if (!eventId || !name || !Array.isArray(itemsRaw)) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: {
            hasEventId: Boolean(eventId),
            hasName: Boolean(name),
            itemsIsArray: Array.isArray(itemsRaw),
          },
        },
        { status: 400 }
      );
    }

    const items: FormItem[] = itemsRaw
      .map(parseFormItem)
      .filter((x): x is FormItem => x !== null);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload", details: { reason: "No valid items" } },
        { status: 400 }
      );
    }

    const regNumber = toTrimmedString(body.regNumber ?? body.RegNumber);
    const orderType = toTrimmedString(body.orderType ?? body.OrderType);
    const phone = toTrimmedString(body.phone ?? body.Phone);

    const rows: RowData[] = items.map((item) => ({
      DancerName: name,
      Category: item.category,
      Program: item.program,
      Time: item.time,
      RegNumber: regNumber,
      OrderType: orderType,
      Phone: phone,
    }));

    await saveRowsToSheet(rows, {
      sheetName: `${eventId}/B`,
      clearBeforeWrite: false,
    });

    return NextResponse.json({ success: true, written: rows.length });
  } catch (err: unknown) {
    console.error("SAVE_FORM_ERROR:", err);

    const message =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
