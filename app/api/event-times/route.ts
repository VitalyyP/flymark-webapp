import { NextResponse } from "next/server";
import { google } from "googleapis";
import { normalizeTimeUniversal } from "@/utils/normalizeTime";

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function uniqNonEmptySorted(items: string[]) {
  return Array.from(new Set(items.map((x) => x.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, "uk", { numeric: true })
  );
}

function timeToMinutes(t: string): number {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1]) * 60 + Number(m[2]);
}

async function getSectionTimesFast(eventId: string): Promise<string[]> {
  try {
    const url = `https://flymark.dance/api/competition/${encodeURIComponent(
      eventId
    )}?mode=table`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "accept-language": "uk-UA,uk;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data: unknown = await res.json().catch(() => ({}));
    if (!isRecord(data)) return [];

    const cats = data["Categories"];
    if (!isRecord(cats)) return [];

    const dateGroups = cats["DateGroups"];
    if (!Array.isArray(dateGroups)) return [];

    const monthMap: Record<string, string> = {
      "січ": "01",
      "лют": "02",
      "бер": "03",
      "кві": "04",
      "трав": "05",
      "чер": "06",
      "лип": "07",
      "сер": "08",
      "вер": "09",
      "жов": "10",
      "лис": "11",
      "гру": "12",
    };

    const times: string[] = [];

    for (const group of dateGroups) {
      if (!isRecord(group)) continue;

      const groupDateStr = group["Date"];
      if (typeof groupDateStr !== "string") continue;

      const m = groupDateStr.match(/(\d{2})\s*([а-яА-Я]{3})\.\s*(\d{4})/i);
      let normalizedDate = groupDateStr;
      if (m) {
        const day = m[1].padStart(2, "0");
        const month = monthMap[m[2].toLowerCase()] || "01";
        const year = m[3];
        normalizedDate = `${year}:${month}:${day}`;
      }

      const sections = group["Sections"];
      if (!Array.isArray(sections)) continue;

      for (const s of sections) {
        if (!isRecord(s)) continue;
        const name = typeof s["Name"] === "string" ? s["Name"].trim() : "";
        if (!name) continue;

        const time = name.replace(".", ":").padStart(5, "0");
        times.push(`${normalizedDate} ${time}`);
      }
    }

    const uniqTimes = Array.from(new Set(times)).sort((a, b) => {
      const [ad, at] = a.split(" ");
      const [bd, bt] = b.split(" ");
      return ad.localeCompare(bd) || timeToMinutes(at) - timeToMinutes(bt);
    });

    return uniqTimes;
  } catch {
    return [];
  }
}

async function getSectionTimesFromSheets(eventId: string): Promise<string[]> {
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
  if (values.length < 3) return [];

  const headers = values[2] ?? [];
  const sectionTimeIndex = headers.findIndex((h) => toStr(h) === "SectionTime");
  if (sectionTimeIndex === -1) return [];

  const timesRaw = values
    .slice(3)
    .map((row) => toStr(row?.[sectionTimeIndex]))
    .filter(Boolean);

  return uniqNonEmptySorted(timesRaw);
}

async function getSectionTimes(eventId: string): Promise<string[]> {
  const fast = await getSectionTimesFast(eventId);
  if (fast.length) return fast;

  return await getSectionTimesFromSheets(eventId);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("event");
    if (!eventId) return NextResponse.json({ times: [] });

    const timesRaw = await getSectionTimes(eventId);

    const times = timesRaw.map((t) => normalizeTimeUniversal(t));

    return NextResponse.json({ times });
  } catch (error) {
    console.error("GET_SECTION_TIMES_ERROR:", error);
    return NextResponse.json({ times: [] }, { status: 500 });
  }
}
