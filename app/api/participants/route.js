import { google } from "googleapis";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event");

  if (!eventId) {
    return Response.json({ error: "Missing event parameter" }, { status: 400 });
  }

  try {
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

    const filtered = rows
      .map((row) => row[DANCER_COLUMN_INDEX])
      .filter(Boolean);

    const unique = [...new Set(filtered)];

    return Response.json(unique);
  } catch (err) {
    console.error("Google Sheets error:", err);
    return Response.json({ error: "Failed to load sheet" }, { status: 500 });
  }
}
