import { NextResponse } from "next/server";
import { parseEvent } from "@/utils/parseEvent";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";
import { convertRowsToObjects } from "@/utils/convertRowsToObjects";

export async function POST(req) {
  try {
    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json(
        { error: "No eventId provided" },
        { status: 400 }
      );
    }

    const parsedData = await parseEvent(eventId);

    const data = convertRowsToObjects(parsedData);

    await saveToGoogleSheet(data, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
    });

    return NextResponse.json({ success: true, parsedData });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
