import { NextResponse } from "next/server";
import { getSheetsClient } from "@/utils/googleSheets";
import { runUpdate } from "@/utils/runUpdate";

const executedKeys = new Set<string>();

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
      const [eventId, ...sections] = row;
      if (!eventId) continue;

      for (const sectionDateStr of sections.filter(Boolean)) {
        const slotDate = new Date(sectionDateStr);
        const diff = Math.floor((slotDate.getTime() - now.getTime()) / 60000); // хвилини

        let range: string | null = null;
        if (diff < 3) range = "less3";
        else if (diff < 10) range = "less10";
        else if (diff < 15) range = "less15";

        if (!range) continue;

        const key = `${eventId}_${sectionDateStr}_${range}`;
        if (executedKeys.has(key)) continue;

        console.log("RUN UPDATE:", { eventId, sectionDateStr, diff, range });

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
