import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalizePrivateKey(key) {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

async function getParticipantsFromSheet(eventId) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.SHEET_ID;

  const sheetName = `${eventId}/B`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:G`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

export async function GET(req) {
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

    if (!time) {
      return NextResponse.json(
        { error: "Missing time parameter" },
        { status: 400 }
      );
    }

    const participants = await getParticipantsFromSheet(eventId);

    const filtered = participants.filter((p) => p.Time === time);

    const result = filtered.map((p) => ({
      regNumber: p.RegNumber || "",
      orderType: p.OrderType || "",
      name: p.DancerName || "",
    }));

    return NextResponse.json({ participants: result });
  } catch (err) {
    console.error("GET_PARTICIPANTS_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
