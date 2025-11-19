import { getSheetClient } from "@/google/googleClient";

export async function POST(req) {
  const body = await req.json();
  const sheets = await getSheetClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GS_ID,
    range: "Sheet1!A:C",
    valueInputOption: "RAW",
    requestBody: {
      values: [[body.name, body.age, body.tgId]],
    },
  });

  return Response.json({ ok: true });
}
