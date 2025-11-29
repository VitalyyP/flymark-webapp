import { google } from "googleapis";

function normalizePrivateKey(key) {
  if (!key) return key;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export async function saveToGoogleSheet(
  data,
  {
    spreadsheetId = process.env.SHEET_ID,
    sheetName = "Sheet1",
    clearBeforeWrite = false,
  } = {}
) {
  if (!spreadsheetId) {
    throw new Error("SHEET_ID (spreadsheetId) is required");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetExists = spreadsheet.data.sheets.some(
    (s) => s.properties.title === sheetName
  );

  if (!sheetExists) {
    console.log(`Creating sheet "${sheetName}"...`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });
  }

  const rowsArray = Array.isArray(data) ? data : [data];
  if (rowsArray.length === 0) return { appended: 0 };

  const headers = Object.keys(rowsArray[0]);

  const values = rowsArray.map((row) =>
    headers.map((h) =>
      typeof row[h] === "object" ? JSON.stringify(row[h]) : row[h] ?? ""
    )
  );

  if (clearBeforeWrite) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers] },
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A2`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return { success: true };
}
