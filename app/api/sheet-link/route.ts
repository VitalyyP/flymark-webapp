import { NextResponse } from "next/server";
import { google } from "googleapis";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

type SheetMeta = { sheetId: number; title: string };

const spreadsheetId = process.env.SHEET_ID;
const SHEETS_BASE_URL = spreadsheetId
  ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  : "https://docs.google.com/spreadsheets";

const sheetIdCache = new Map<string, number>();

async function getSheetsMeta(): Promise<SheetMeta[]> {
  if (!spreadsheetId) throw new Error("SHEET_ID required");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const list = res.data.sheets ?? [];

  return list
    .map((s) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    }))
    .filter((x): x is SheetMeta => typeof x.sheetId === "number" && !!x.title);
}

async function resolveGidByTitle(title: string): Promise<number | null> {
  const cached = sheetIdCache.get(title);
  if (typeof cached === "number") return cached;

  const sheets = await getSheetsMeta();
  const found = sheets.find((s) => s.title === title);
  if (!found) return null;

  sheetIdCache.set(title, found.sheetId);
  return found.sheetId;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const competitionId = (url.searchParams.get("id") ?? "").trim();

    if (!competitionId) {
      return NextResponse.redirect(SHEETS_BASE_URL, { status: 302 });
    }

    const title = `${competitionId}/B`;
    const gid = await resolveGidByTitle(title);

    const target = gid ? `${SHEETS_BASE_URL}#gid=${gid}` : SHEETS_BASE_URL;

    return NextResponse.redirect(target, { status: 302 });
  } catch (err) {
    console.error("GET /api/sheet-link error:", err);
    return NextResponse.redirect(SHEETS_BASE_URL, { status: 302 });
  }
}
