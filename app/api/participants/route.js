import { google } from "googleapis";
import { parseEvent } from "@/utils/parseEvent";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";
import { convertRowsToObjects } from "@/utils/convertRowsToObjects";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event");

  if (!eventId) {
    return new Response(JSON.stringify({ error: "Missing event parameter" }), {
      status: 400,
    });
  }

  try {
    const parsedData = await parseEvent(eventId);

    const data = convertRowsToObjects(parsedData);

    await saveToGoogleSheet(data, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
    });

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

    const rows = response.data.values || [];

    const DANCER_COLUMN_INDEX = 7;

    const participants = rows
      .map((row) => row[DANCER_COLUMN_INDEX])
      .filter(Boolean);

    const uniqueParticipants = [...new Set(participants)];

    return new Response(JSON.stringify(uniqueParticipants), {
      status: 200,
    });
  } catch (err) {
    console.error("Error parsing/saving/fetching participants:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load participants" }),
      { status: 500 }
    );
  }
}
