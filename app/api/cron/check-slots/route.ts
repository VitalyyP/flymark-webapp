import { NextResponse } from "next/server";
import { getSheetsClient } from "@/utils/googleSheets";
import { runUpdate } from "@/utils/runUpdate";

const executedKeys = new Set<string>();

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const authQuery = new URL(req.url).searchParams.get("authorization");

    if (
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      authQuery !== process.env.CRON_SECRET
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sheets, spreadsheetId } = await getSheetsClient("read");

    let rows: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `visibleEvents!A2:Z`,
      });

      rows = (res.data.values ?? []) as string[][];
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message)
          : "";

      if (message.includes("Requested entity was not found")) {
        return NextResponse.json(
          { ok: false, error: "visibleEvents sheet not found" },
          { status: 200 }
        );
      }

      throw e;
    }

    const now = new Date();
    console.log("CRON RUN:", now.toISOString());

    for (const row of rows) {
      const [eventId, date, ...times] = row;
      if (!eventId || !date) continue;

      for (const time of times.filter(Boolean)) {
        const slotDate = parseDateTime(date, time);
        const diff = Math.floor((slotDate.getTime() - now.getTime()) / 60000);

        if ([10, 5, 0].includes(diff)) {
          const key = `${eventId}_${time}_${diff}`;
          if (executedKeys.has(key)) continue;

          console.log("RUN UPDATE:", { eventId, time, diff });

          try {
            await runUpdate(eventId);
          } catch (err) {
            console.warn(`runUpdate failed for event ${eventId}`, err);
            continue;
          }

          executedKeys.add(key);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[CRON ERROR]", e);
    return NextResponse.json({ ok: false });
  }
}

function parseDateTime(date: string, time: string): Date {
  const [day, month, year] = date.split(".");
  return new Date(`${year}-${month}-${day}T${time}:00`);
}
