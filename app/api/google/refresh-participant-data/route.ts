import { google } from "googleapis";
import { NextResponse } from "next/server";
import { normalizeTime } from "@/utils/normalizeTime";

export const runtime = "nodejs";

type SheetRow = (string | number | boolean | null | undefined)[];

type ApiOk = {
  ok: true;
  updated: number;
  tried: number;
  checked: number;
  errors?: Array<{ row: number; name: string; reason: string }>;
};

type ApiErr = { ok: false; error: string };

function normalizePrivateKey(key?: string) {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function clean(s: string) {
  return s.trim().replace(/\s+/g, " ");
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
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

type FlyCat = {
  CategoryName: string;
  SectionId: number | null;
  ResultProgramName: string;
};

type FlySection = { Id: number; Name: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function readNumber(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

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
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function pickStrictFlyCat(rowCat: string, rowProg: string, cats: FlyCat[]) {
  const cat = clean(rowCat);
  const prog = clean(rowProg);

  return (
    cats.find(
      (c) =>
        clean(c.CategoryName) === cat && clean(c.ResultProgramName) === prog
    ) ?? null
  );
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = toStr(searchParams.get("eventId"));

    if (!eventId) {
      const body: ApiErr = { ok: false, error: "Missing eventId" };
      return NextResponse.json(body, { status: 400 });
    }

    const sheetName = `${eventId}/B`;

    const { sheets, spreadsheetId } = await getSheetsClient();

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = (resp.data.values ?? []) as SheetRow[];

    if (rows.length < 3) {
      return NextResponse.json({ ok: true, updated: 0, tried: 0, checked: 0 });
    }

    const headers = (rows[2] ?? []).map((h) =>
      typeof h === "string" ? h.trim() : ""
    );

    const idxName = headers.indexOf("DancerName");
    const idxCat = headers.indexOf("Category");
    const idxProg = headers.indexOf("Program");
    const idxTime = headers.indexOf("Time");

    if ([idxName, idxCat, idxProg, idxTime].includes(-1)) {
      return NextResponse.json(
        { ok: false, error: "Required columns missing" },
        { status: 500 }
      );
    }

    const colTime = colToA1(idxTime);

    const updatesTime: Array<{ range: string; values: string[][] }> = [];
    const errors: ApiOk["errors"] = [];

    let tried = 0;

    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const sheetRow = i + 1;

      const name = toStr(row[idxName]);
      if (!name) continue;

      tried++;

      const rowCat = toStr(row[idxCat]);
      const rowProg = toStr(row[idxProg]);

      const r = await fetchJson(
        `https://flymark.dance/api/competitionStream/${eventId}/0`
      );

      const cats = parseCats(r.data);

      const best = pickStrictFlyCat(rowCat, rowProg, cats);

      if (!best) {
        errors?.push({
          row: sheetRow,
          name,
          reason: "Category + Program mismatch (strict only)",
        });
        continue;
      }

      let newTime = "";

      if (best.SectionId !== null) {
        const r2 = await fetchJson(
          `https://flymark.dance/api/competitionStream/${eventId}/${best.SectionId}`
        );

        const secs = parseSections(r2.data);

        newTime = normalizeTime(
          secs.find((s) => s.Id === best.SectionId)?.Name ?? ""
        );
      }

      const oldTime = normalizeTime(row[idxTime]);

      if (!newTime || newTime === oldTime) continue;

      updatesTime.push({
        range: `${sheetName}!${colTime}${sheetRow}`,
        values: [[newTime]],
      });
    }

    if (updatesTime.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updatesTime,
        },
      });
    }

    const body: ApiOk = {
      ok: true,
      updated: updatesTime.length,
      tried,
      checked: rows.length - 3,
      errors: errors?.length ? errors : undefined,
    };

    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
