import { google } from "googleapis";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const eventId = searchParams.get("event");

    if (!name) {
      return Response.json({ error: "Missing name" }, { status: 400 });
    }

    if (!eventId) {
      return Response.json(
        { error: "Missing event parameter" },
        { status: 400 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${eventId}/A!A:Z`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return Response.json({ results: [] });

    const headers = rows[0].map((h) => (h || "").trim());
    const dataRows = rows.slice(1);

    const headerIndex = Object.fromEntries(headers.map((h, i) => [h, i]));

    const dancer1Index = headerIndex["Dancer1Name"];
    const dancer2Index = headerIndex["Dancer2Name"];
    const categoryIndex = headerIndex["Категорії змагань"];

    if (
      dancer1Index === undefined ||
      dancer2Index === undefined ||
      categoryIndex === undefined
    ) {
      return Response.json(
        {
          error:
            "Required columns (Dancer1Name, Dancer2Name, Категорії змагань) not found",
        },
        { status: 500 }
      );
    }

    const divisionColumns = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter((c) => c.header.toLowerCase().includes("відділення"));

    const normalizeText = (s) => (s || "").trim().normalize("NFC");
    const nameParts = normalizeText(name).split(" ");

    const results = [];

    for (const row of dataRows) {
      const dancer1 = row[dancer1Index] || "";
      const dancer2 = row[dancer2Index] || "";
      const category = row[categoryIndex] || "";

      const matches = [dancer1, dancer2].some((dancer) =>
        nameParts.every((part) => normalizeText(dancer).includes(part))
      );

      if (!matches || !category) continue;

      let time = null;
      for (const col of divisionColumns) {
        const cell = row[col.index];
        if (cell && String(cell).trim() !== "") {
          time = col.header;
          break;
        }
      }

      if (!time) continue;

      results.push({
        category,
        time,
        dancer1Name: dancer1,
        dancer2Name: dancer2,
      });
    }

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
