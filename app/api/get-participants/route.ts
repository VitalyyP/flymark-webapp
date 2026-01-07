import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

type SheetRow = {
  DancerName: string;
  Category: string;
  Time: string;
  RegNumber: string;
  OrderType: string;
  Phone: string;
};

async function getParticipantsFromSheet(
  eventId: string
): Promise<{ headers: string[]; rows: SheetRow[] }> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SHEET_ID!;
  const sheetName = `${eventId}/B`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:G`,
  });

  const values = response.data.values ?? [];

  if (values.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = values[0];
  const dataRows = values.slice(1);

  const rows: SheetRow[] = dataRows.map((row) => ({
    DancerName: row[0] ?? "",
    Category: row[1] ?? "",
    Time: row[2] ?? "",
    RegNumber: row[3] ?? "",
    OrderType: row[4] ?? "",
    Phone: row[5] ?? "",
  }));

  return { headers, rows };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event");
    const time = searchParams.get("time");

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event parameter" },
        { status: 400 }
      );
    }

    const { headers, rows } = await getParticipantsFromSheet(eventId);

    if (!time) {
      return NextResponse.json({ headers, rows });
    }

    const filtered = rows.filter((r) => r.Time === time);

    const participants = filtered.map((p) => ({
      regNumber: p.RegNumber || "",
      orderType: p.OrderType || "",
      category: p.Category || "",
      name: p.DancerName || "",
    }));

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("GET_PARTICIPANTS_ERROR:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
