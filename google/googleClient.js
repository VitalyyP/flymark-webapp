import { google } from "googleapis";

export async function getSheetClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GS_PROJECT_ID,
      private_key: process.env.GS_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.GS_CLIENT_EMAIL,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}
