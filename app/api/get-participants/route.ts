import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

type SheetRow = {
  DancerName: string;
  Category: string;
  Program: string;
  Time: string;
  RegNumber: string;
  OrderType: string;
  Phone: string;
};

type SheetResult = {
  headers: string[];
  rows: SheetRow[];
};

async function getParticipantsFromSheet(eventId: string): Promise<SheetResult> {
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
    range: `${sheetName}!A:Z`,
  });

  const values = response.data.values ?? [];
  if (values.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map((h) => h.trim());
  const dataRows = values.slice(1);

  const indexByName = (name: string): number =>
    headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const getValue = (row: string[], name: string): string => {
    const index = indexByName(name);
    return index >= 0 ? row[index] ?? "" : "";
  };

  const rows: SheetRow[] = dataRows.map((row) => ({
    DancerName: getValue(row, "DancerName"),
    Category: getValue(row, "Category"),
    Program: getValue(row, "Program"),
    Time: getValue(row, "Time"),
    RegNumber: getValue(row, "RegNumber"),
    OrderType: getValue(row, "OrderType"),
    Phone: getValue(row, "Phone"),
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
      regNumber: p.RegNumber,
      orderType: p.OrderType,
      category: p.Category,
      program: p.Program,
      name: p.DancerName,
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
