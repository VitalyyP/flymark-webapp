import { google } from "googleapis";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const eventId = searchParams.get("event");

    if (!name) {
      return new Response(JSON.stringify({ error: "Missing name" }), {
        status: 400,
      });
    }

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: "Missing event parameter" }),
        { status: 400 }
      );
    }

    if (
      !process.env.GOOGLE_CLIENT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !process.env.SHEET_ID
    ) {
      throw new Error("Missing Google Sheets environment variables");
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

    if (rows.length < 2)
      return new Response(JSON.stringify({ results: [] }), { status: 200 });

    const headers = rows[0].map((h) => (h || "").trim());
    const dataRows = rows.slice(1);

    const dancer1Index = headers.indexOf("Dancer1Name");
    const dancer2Index = headers.indexOf("Dancer2Name");
    const categoryIndex = headers.indexOf("CategoryName");
    const timeIndex = headers.indexOf("SectionTime");
    const programIndex = headers.indexOf("ProgramName");

    if (
      dancer1Index === -1 ||
      dancer2Index === -1 ||
      categoryIndex === -1 ||
      timeIndex === -1 ||
      programIndex === -1
    ) {
      return new Response(
        JSON.stringify({ error: "Required columns not found" }),
        { status: 500 }
      );
    }

    const normalize = (s: string | undefined) =>
      (s || "").trim().normalize("NFC");
    const nameParts = normalize(name).split(" ");

    const results = dataRows
      .map((row) => {
        const dancer1 = row[dancer1Index] || "";
        const dancer2 = row[dancer2Index] || "";
        const category = row[categoryIndex] || "";
        const time = row[timeIndex] || "";
        const program = row[programIndex] || "";

        const matches = [dancer1, dancer2].some((d) =>
          nameParts.every((part) => normalize(d).includes(part))
        );

        if (!matches || !category) return null;

        return {
          category,
          time,
          dancer1Name: dancer1,
          dancer2Name: dancer2,
          program,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify(results), { status: 200 });
  } catch (e: unknown) {
    console.error("Error:", e);

    if (e instanceof Error) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
      });
    }
    return new Response(JSON.stringify({ error: "Unknown error occurred" }), {
      status: 500,
    });
  }
}
