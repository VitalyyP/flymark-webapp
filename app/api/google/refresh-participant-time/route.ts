import { google } from "googleapis";
import { NextResponse } from "next/server";
import { normalizeTime } from "@/utils/normalizeTime";

export const runtime = "nodejs";

type SheetRow = (string | number | boolean | null | undefined)[];

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function normKey(s: string) {
  return s.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
}

function colToA1(colIndex0: number) {
  let n = colIndex0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const spreadsheetId = process.env.SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error("Missing Google Sheets env");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type FlyCat = {
  CategoryName: string;
  SectionId: number | null;
  ResultProgramName: string;
};

function parseCats(data: unknown): FlyCat[] {
  if (!isRecord(data)) return [];
  const raw = data["Categories"];
  if (!Array.isArray(raw)) return [];

  const out: FlyCat[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;

    const CategoryName = readString(item["CategoryName"]);
    const SectionId = readNumber(item["SectionId"]);

    let ResultProgramName = "";
    const rp = item["ResultProgram"];
    if (isRecord(rp)) ResultProgramName = readString(rp["ProgramName"]);

    if (!CategoryName) continue;

    out.push({ CategoryName, SectionId, ResultProgramName });
  }
  return out;
}

type FlySection = { Id: number; Name: string };

function parseSections(data: unknown): FlySection[] {
  if (!isRecord(data)) return [];
  const raw = data["Sections"];
  if (!Array.isArray(raw)) return [];

  const out: FlySection[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;

    const Id = readNumber(item["Id"]);
    const Name = readString(item["Name"]);

    if (Id === null || !Name) continue;
    out.push({ Id, Name });
  }
  return out;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

type DancerIndexItem = { id: string; key: string; fullName: string };

async function buildDancerIndex(eventId: string): Promise<DancerIndexItem[]> {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

  const r = await fetch(
    `${base}/api/participants-fast?eventId=${encodeURIComponent(eventId)}`,
    { cache: "no-store" }
  );
  const j = await r.json().catch(() => ({}));

  const out: DancerIndexItem[] = [];

  if (Array.isArray(j?.dancers)) {
    for (const d of j.dancers) {
      const fullName = `${toStr(d.LastName)} ${toStr(d.FirstName)}`.trim();
      const id = toStr(d.Id);
      if (!fullName || !id) continue;

      out.push({
        id,
        key: fullName.toLowerCase().normalize("NFC"),
        fullName,
      });
    }
  }

  const uniq = new Map<string, DancerIndexItem>();
  for (const x of out) if (!uniq.has(x.key)) uniq.set(x.key, x);
  return Array.from(uniq.values());
}

function cleanForMatch(s: string) {
  let str = s.trim();
  if (
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('"') && str.endsWith('"'))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

function pickStrictFlyCat(rowCat: string, rowProg: string, cats: FlyCat[]) {
  const cat = cleanForMatch(rowCat);
  const prog = cleanForMatch(rowProg);

  return (
    cats.find(
      (c) =>
        cleanForMatch(c.CategoryName) === cat &&
        cleanForMatch(c.ResultProgramName) === prog
    ) ?? null
  );
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = toStr(searchParams.get("eventId"));
    if (!eventId)
      return NextResponse.json(
        { ok: false, error: "Missing eventId" },
        { status: 400 }
      );

    const sheetName = `${eventId}/B`;
    const { sheets, spreadsheetId } = await getSheetsClient();

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    const rows = (resp.data.values ?? []) as SheetRow[];
    if (rows.length < 3)
      return NextResponse.json({ ok: true, updated: 0, tried: 0, checked: 0 });

    const headers = (rows[2] ?? []).map((h) => toStr(h));
    const idxName = headers.indexOf("DancerName");
    const idxCat = headers.indexOf("Category");
    const idxProg = headers.indexOf("Program");
    const idxTime = headers.indexOf("Time");
    const colTime = colToA1(idxTime);

    const dancerIndex = await buildDancerIndex(eventId);
    const dancerMap = new Map(dancerIndex.map((d) => [d.key, d]));

    const updates: Array<{ range: string; values: string[][] }> = [];
    const errors: Array<{ row: number; name: string; reason: string }> = [];
    let tried = 0;

    await Promise.allSettled(
      rows.slice(3).map(async (row, i) => {
        const sheetRow = i + 4;
        const name = toStr(row[idxName]);
        if (!name) return;
        tried++;

        const dancer = dancerMap.get(normKey(name));
        if (!dancer) {
          errors.push({ row: sheetRow, name, reason: "Dancer not found" });
          return;
        }

        const rowCat = toStr(row[idxCat]);
        const rowProg = toStr(row[idxProg]);

        const url = `https://flymark.dance/api/competitionStream/${encodeURIComponent(
          eventId
        )}/0?dancerId=${encodeURIComponent(dancer.id)}`;
        const catsResp = await fetchJson(url);
        const cats = parseCats(catsResp.data);
        if (!cats.length) return;

        const matchedCat = pickStrictFlyCat(rowCat, rowProg, cats);
        if (!matchedCat) {
          const catMatch = cats.some(
            (c) => cleanForMatch(c.CategoryName) === cleanForMatch(rowCat)
          );
          const progMatch = cats.some(
            (c) => cleanForMatch(c.ResultProgramName) === cleanForMatch(rowProg)
          );
          const reason =
            !catMatch && !progMatch
              ? `Category + Program mismatches ('${rowCat}' / '${rowProg}')`
              : !catMatch
              ? `Category mismatches ('${rowCat}')`
              : !progMatch
              ? `Program mismatches ('${rowProg}')`
              : `Category + Program mismatch (strict)`;

          errors.push({ row: sheetRow, name, reason });
          return;
        }

        let newTime = "";
        if (matchedCat.SectionId !== null) {
          const rSec = await fetchJson(
            `https://flymark.dance/api/competitionStream/${encodeURIComponent(
              eventId
            )}/${matchedCat.SectionId}`
          );
          const secs = parseSections(rSec.data);
          newTime = secs.find((s) => s.Id === matchedCat.SectionId)?.Name ?? "";
        }

        newTime = normalizeTime(newTime);
        const oldTime = normalizeTime(row[idxTime]);
        if (oldTime !== newTime && newTime) {
          updates.push({
            range: `${sheetName}!${colTime}${sheetRow}`,
            values: [[newTime]],
          });
        }
      })
    );

    if (updates.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: "USER_ENTERED", data: updates },
      });
    }

    return NextResponse.json({
      ok: true,
      updated: updates.length,
      tried,
      checked: rows.length - 3,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
