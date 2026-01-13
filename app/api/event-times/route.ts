import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

async function getSectionTimes(eventId: string): Promise<string[]> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SHEET_ID!;
  const sheetName = `${eventId}/A`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const values = response.data.values ?? [];
  if (values.length < 2) return [];

  const headers = values[0];
  const sectionTimeIndex = headers.findIndex(
    (h) => (h || "").trim() === "SectionTime"
  );

  if (sectionTimeIndex === -1) return [];

  const times = Array.from(
    new Set(
      values
        .slice(1)
        .map((row) => row[sectionTimeIndex])
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "uk", { numeric: true }));

  return times as string[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event");

    if (!eventId) {
      return NextResponse.json({ times: [] });
    }

    const times = await getSectionTimes(eventId);

    return NextResponse.json({ times });
  } catch (error) {
    console.error("GET_SECTION_TIMES_ERROR:", error);
    return NextResponse.json({ times: [] }, { status: 500 });
  }
}
