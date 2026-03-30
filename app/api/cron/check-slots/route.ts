import { NextResponse } from "next/server";

import { DateTime } from "luxon";

import { getSheetsClient } from "@/utils/googleSheets";
import { runUpdate } from "@/utils/runUpdate";

const executedKeys = new Set<string>();

function parseKyivDate(dateStr: string): Date {
  return DateTime.fromFormat(dateStr, "yyyy:MM:dd HH:mm", {
    zone: "Europe/Kyiv",
  }).toJSDate();
}

export async function GET(req: Request) {
  console.log("CRON HIT", new Date().toISOString());

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
        range: `visibleEvents!A1:Z`,
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

    const dataRows = rows.slice(3);

    for (const row of dataRows) {
      const [eventId, ...sections] = row;

      if (!eventId) continue;

      for (const sectionDateStr of sections.filter(Boolean)) {
        const slotDate = parseKyivDate(sectionDateStr);
        console.log("SLOT_DATE:", slotDate);

        if (isNaN(slotDate.getTime())) continue;

        const diff = Math.round((slotDate.getTime() - now.getTime()) / 60000);

        if (diff < -15 || diff > 15) continue;

        type Range = "before15" | "around5" | "after15";

        function getRange(diff: number): Range {
          if (diff > 5) return "before15";
          if (diff >= -5) return "around5";
          return "after15";
        }

        const range = getRange(diff);
        const key = `${eventId}_${sectionDateStr}_${range}`;
        if (executedKeys.has(key)) continue;

        console.log("RUN UPDATE");

        try {
          await runUpdate(eventId);
        } catch (err) {
          console.warn(`runUpdate failed for event ${eventId}`, err);
          continue;
        }

        executedKeys.add(key);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[CRON ERROR]", e);
    return NextResponse.json({ ok: false });
  }
}
