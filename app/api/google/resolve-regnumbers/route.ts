import { google } from "googleapis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SheetRow = (string | undefined)[];

type ApiOk = {
  ok: true;
  updated: number;
  tried: number;
  checked: number;
  errors?: Array<{ name: string; reason: string }>;
};

type ApiErr = {
  ok: false;
  error: string;
  details?: unknown;
};

function normalizePrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function toTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
    throw new Error("Missing Google Sheets environment variables");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId
  };
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = toTrimmedString(searchParams.get("eventId"));

    if (!eventId) {
      const body: ApiErr = { ok: false, error: "Missing eventId" };
      return NextResponse.json(body, { status: 400 });
    }

    const sheetName = `${eventId}/B`;

    const { sheets, spreadsheetId } = await getSheetsClient();

    let resp;
    try {
      resp = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:Z`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("Unable to parse range")) {
        const body: ApiErr = {
          ok: false,
          error: `Аркуш ${sheetName} не існує`
        };
        return NextResponse.json(body, { status: 404 });
      }

      throw error;
    }

    const rows = (resp.data.values ?? []) as SheetRow[];
    if (rows.length < 2) {
      const body: ApiOk = { ok: true, updated: 0, checked: 0, tried: 0 };
      return NextResponse.json(body, { status: 200 });
    }

    const headers = rows[0].map((h) => (typeof h === "string" ? h.trim() : ""));
    const dataRows = rows.slice(1);

    const idxName = headers.indexOf("DancerName");
    const idxReg = headers.indexOf("RegNumber");

    if (idxName === -1 || idxReg === -1) {
      const body: ApiErr = {
        ok: false,
        error: "Required columns not found",
        details: { idxName, idxReg }
      };
      return NextResponse.json(body, { status: 500 });
    }

    const regColA1 = colToA1(idxReg);

    const tasks = dataRows
      .map((row, i) => {
        const rowNumberInSheet = i + 2;
        const name = (row[idxName] ?? "").toString().trim();
        const reg = (row[idxReg] ?? "").toString().trim();

        if (!name) return null;
        if (reg !== "Не знаю") return null;

        return { name, rowNumberInSheet };
      })
      .filter(Boolean) as Array<{ name: string; rowNumberInSheet: number }>;

    if (tasks.length === 0) {
      const body: ApiOk = {
        ok: true,
        updated: 0,
        checked: dataRows.length,
        tried: 0
      };
      return NextResponse.json(body, { status: 200 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000";

    const updates: Array<{ range: string; values: string[][] }> = [];
    const errors: Array<{ name: string; reason: string }> = [];

    for (const t of tasks) {
      try {
        const url = `${baseUrl}/api/flymark/find-number-by-name?competitionId=${encodeURIComponent(
          eventId
        )}&name=${encodeURIComponent(t.name)}`;

        const r = await fetch(url, { cache: "no-store" });
        const j = (await r.json()) as {
          number?: number | null;
          error?: string;
        };

        if (!r.ok) {
          errors.push({
            name: t.name,
            reason: j.error ?? "Flymark request failed"
          });
          continue;
        }

        if (typeof j.number === "number") {
          updates.push({
            range: `${sheetName}!${regColA1}${t.rowNumberInSheet}`,
            values: [[String(j.number)]]
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        errors.push({ name: t.name, reason: msg });
      }
    }

    if (updates.length === 0) {
      const body: ApiOk = {
        ok: true,
        updated: 0,
        checked: dataRows.length,
        tried: tasks.length,
        errors
      };
      return NextResponse.json(body, { status: 200 });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: updates
      }
    });

    const body: ApiOk = {
      ok: true,
      updated: updates.length,
      checked: dataRows.length,
      tried: tasks.length,
      errors
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const body: ApiErr = { ok: false, error: msg };
    return NextResponse.json(body, { status: 500 });
  }
}
