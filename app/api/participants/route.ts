import { parseEvent, PerformanceRow } from "@/utils/parseEvent";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("event");
  const eventId = eventIdParam ? Number(eventIdParam) : NaN;

  if (!eventId || isNaN(eventId)) {
    return new Response("Missing or invalid event ID", { status: 400 });
  }

  try {
    const rows: PerformanceRow[] = await parseEvent(eventId);

    await saveToGoogleSheet(rows, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
    });

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch or save event:", error);
    return new Response("Failed to fetch or save event", { status: 500 });
  }
}
