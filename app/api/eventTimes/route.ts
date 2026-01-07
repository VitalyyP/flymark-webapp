import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event");
  if (!eventId)
    return NextResponse.json({ error: "Missing event" }, { status: 400 });

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SHEET_ID!;
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${eventId}/B!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return NextResponse.json({ times: [] });

    const headers = rows[0];
    console.log("HEADERS:", headers);
    const timeIndex = headers.findIndex((h) => h.toLowerCase() === "time");
    if (timeIndex === -1) return NextResponse.json({ times: [] });

    const times = rows
      .slice(1)
      .map((r) => r[timeIndex])
      .filter((t) => t)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    return NextResponse.json({ times });
  } catch (err) {
    console.error("Failed fetching times:", err);
    return NextResponse.json({ times: [] });
  }
}
