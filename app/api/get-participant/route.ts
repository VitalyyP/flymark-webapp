import { google } from "googleapis";
import { NextResponse } from "next/server";

type SheetRow = (string | undefined)[];

type ResultItem = {
  category: string;
  time: string;
  dancer1Name: string;
  dancer2Name: string;
  program: string;
  city: string;
  club: string;
};

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function normalizeText(s: string): string {
  return s.trim().normalize("NFC");
}

function safeCell(row: SheetRow, idx: number): string {
  if (idx < 0) return "";
  const v = row[idx];
  return typeof v === "string" ? v : "";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const eventIdRaw = searchParams.get("event");
    const nameRaw = searchParams.get("name");
    const idRaw = searchParams.get("id");

    const eventId = normalizeText(eventIdRaw ?? "");
    const name = normalizeText(nameRaw ?? "");
    const dancerId = normalizeText(idRaw ?? "");

    if (!eventId) {
      return NextResponse.json(
        { error: "Missing event parameter" },
        { status: 400 }
      );
    }

    if (!dancerId && !name) {
      return NextResponse.json(
        { error: "Missing id or name parameter" },
        { status: 400 }
      );
    }

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    const spreadsheetId = process.env.SHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return NextResponse.json(
        { error: "Missing Google Sheets environment variables" },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${eventId}/A!A:Z`,
    });

    const rows = (response.data.values ?? []) as SheetRow[];

    if (rows.length < 3) {
      return NextResponse.json([], { status: 200 });
    }

    const headers = rows[2].map((h) => (typeof h === "string" ? h.trim() : ""));
    const dataRows = rows.slice(3);

    const dancer1NameIdx = headers.indexOf("Dancer1Name");
    const dancer2NameIdx = headers.indexOf("Dancer2Name");
    const categoryIdx = headers.indexOf("CategoryName");
    const timeIdx = headers.indexOf("SectionTime");
    const programIdx = headers.indexOf("ProgramName");
    const clubIdx = headers.indexOf("DancingClub");
    const cityIdx = headers.indexOf("City");

    const dancer1IdIdx = headers.indexOf("Dancer1Id");
    const dancer2IdIdx = headers.indexOf("Dancer2Id");

    const required = [
      dancer1NameIdx,
      categoryIdx,
      timeIdx,
      programIdx,
      clubIdx,
      cityIdx,
    ];

    if (required.some((x) => x === -1)) {
      return NextResponse.json(
        { error: "Required columns not found" },
        { status: 500 }
      );
    }

    const nameParts = name
      ? normalizeText(name).split(/\s+/).filter(Boolean)
      : [];

    const results: ResultItem[] = dataRows
      .map((row) => {
        const dancer1Name = safeCell(row, dancer1NameIdx);
        const dancer2Name = safeCell(row, dancer2NameIdx);
        const category = safeCell(row, categoryIdx);
        const time = safeCell(row, timeIdx);
        const program = safeCell(row, programIdx);
        const club = safeCell(row, clubIdx);
        const city = safeCell(row, cityIdx);

        if (!category) return null;

        if (dancerId) {
          const d1id = safeCell(row, dancer1IdIdx);
          const d2id = safeCell(row, dancer2IdIdx);

          const matchesById =
            normalizeText(d1id) === dancerId ||
            normalizeText(d2id) === dancerId;

          if (!matchesById) return null;

          return {
            category,
            time,
            dancer1Name,
            dancer2Name,
            program,
            club,
            city,
          };
        }

        const matchesByName = [dancer1Name, dancer2Name].some((d) => {
          const nd = normalizeText(d);
          return nameParts.every((part) => nd.includes(part));
        });

        if (!matchesByName) return null;

        return {
          category,
          time,
          dancer1Name,
          dancer2Name,
          program,
          club,
          city,
        };
      })
      .filter((x): x is ResultItem => x !== null);

    return NextResponse.json(results, { status: 200 });
  } catch (e: unknown) {
    console.error("Error:", e);
    const message = e instanceof Error ? e.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
