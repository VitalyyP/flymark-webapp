import { saveRowsToSheet } from "@/utils/googleSheets";
import { parseEvent } from "@/utils/parseEvent";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("event");
  const eventId = eventIdParam ? Number(eventIdParam) : NaN;

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return new Response("Missing or invalid event ID", { status: 400 });
  }

  try {
    const { rows, eventName } = await parseEvent(eventId);

    await saveRowsToSheet(rows, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
      title: eventName || `Event ${eventId}`
    });

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Failed to fetch or save event:", error);
    return new Response("Failed to fetch or save event", { status: 500 });
  }
}
