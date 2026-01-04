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

    const results = [];

    const timeMap = {
      2: "I відділення  / 8:30",
      3: "II відділення / 10:30",
      4: "III відділення / 14:30",
      5: "IV відділення / 17:30",
      6: "V відділення / 19:30",
    };

    for (const row of rows) {
      const dancer1 = row[7] || "";
      const dancer2 = row[8] || "";
      const category = row[1];

      const normalizedName = name.trim().normalize("NFC");
      const matches =
        dancer1.trim().normalize("NFC") === normalizedName ||
        dancer2.trim().normalize("NFC") === normalizedName;

      if (!matches) continue;
      if (!category) continue;

      let time = null;

      for (const colIndex of Object.keys(timeMap)) {
        const index = Number(colIndex);
        if (row[index] && row[index].trim() !== "") {
          time = timeMap[index];
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
    console.error(e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
