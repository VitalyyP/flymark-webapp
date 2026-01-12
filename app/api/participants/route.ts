import { google } from "googleapis";
import { parseEvent } from "@/utils/parseEvent";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("event");

  if (!eventIdParam) {
    return new Response(JSON.stringify({ error: "Missing event parameter" }), {
      status: 400,
    });
  }

  const eventId = Number(eventIdParam);

  try {
    const rows = await parseEvent(eventId);

    const sheetRows = rows.map((r) => ({
      SectionTime: r.SectionTime ?? "",
      CategoryName: r.CategoryName ?? "",
      Dancer1Name: r.Dancer1Name ?? "",
      Dancer2Name: r.Dancer2Name ?? "",
    }));

    await saveToGoogleSheet(sheetRows, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
    });

    if (
      !process.env.GCP_PROJECT_ID ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.GOOGLE_CLIENT_EMAIL ||
      !process.env.SHEET_ID
    ) {
      throw new Error("Missing Google Sheets environment variables");
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GCP_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `${eventId}/A`,
    });

    const sheetData = response.data.values || [];
    if (sheetData.length === 0)
      return new Response(JSON.stringify([]), { status: 200 });

    const headers = sheetData[0];
    const dataRows = sheetData.slice(1);

    const dancer1Index = headers.indexOf("Dancer1Name");
    const dancer2Index = headers.indexOf("Dancer2Name");

    if (dancer1Index === -1 || dancer2Index === -1)
      return new Response(JSON.stringify([]), { status: 200 });

    const participants = dataRows.flatMap((row) =>
      [row[dancer1Index], row[dancer2Index]].filter(Boolean)
    );

    const uniqueParticipants = [...new Set(participants)];

    return new Response(JSON.stringify(uniqueParticipants), { status: 200 });
  } catch (err) {
    console.error("Error parsing/saving/fetching participants:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load participants" }),
      { status: 500 }
    );
  }
}
