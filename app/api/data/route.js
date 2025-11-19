import { getSheetClient } from "@/google/googleClient";

export async function GET(req) {
  const ageFilter = req.nextUrl.searchParams.get("age");

  const sheets = await getSheetClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GS_ID,
    range: "Sheet1!A:C",
  });

  let rows = res.data.values || [];

  if (ageFilter) {
    rows = rows.filter((r) => r[1] == ageFilter);
  }

  const formatted = rows.map((r) => ({
    name: r[0],
    age: r[1],
    tgId: r[2],
  }));

  return Response.json(formatted);
}
