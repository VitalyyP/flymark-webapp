// import { google } from "googleapis";
// import { parseEvent } from "@/utils/parseEvent";
// import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";

// type SheetRow = {
//   SectionTime: string;
//   CategoryName: string;
//   ProgramName: string;
//   Dancer1Name: string;
//   Dancer2Name: string;
// };

// export async function GET(req: Request) {
//   const { searchParams } = new URL(req.url);
//   const eventIdParam = searchParams.get("event");

//   if (!eventIdParam) {
//     return new Response(JSON.stringify({ error: "Missing event parameter" }), {
//       status: 400,
//     });
//   }

//   const eventId = Number(eventIdParam);

//   try {
//     const parsedEvent = await parseEvent(eventId);

//     const sheetRows: SheetRow[] = [];

//     for (const section of parsedEvent.Sections) {
//       for (const category of section.Categories) {
//         for (const reg of category.Registrations) {
//           const dancers = reg.Dancers ?? [];
//           const programs = reg.Programs ?? [];

//           for (const program of programs) {
//             sheetRows.push({
//               SectionTime: section.SectionName,
//               CategoryName: category.CategoryName,
//               ProgramName: program.Name ?? "",
//               Dancer1Name: dancers[0]?.FullName ?? "",
//               Dancer2Name: dancers[1]?.FullName ?? "",
//             });
//           }
//         }
//       }
//     }

//     await saveToGoogleSheet(sheetRows, {
//       sheetName: `${eventId}/A`,
//       clearBeforeWrite: true,
//     });

//     if (
//       !process.env.GCP_PROJECT_ID ||
//       !process.env.GOOGLE_PRIVATE_KEY ||
//       !process.env.GOOGLE_CLIENT_EMAIL ||
//       !process.env.SHEET_ID
//     ) {
//       throw new Error("Missing Google Sheets environment variables");
//     }

//     const auth = new google.auth.GoogleAuth({
//       credentials: {
//         type: "service_account",
//         project_id: process.env.GCP_PROJECT_ID,
//         private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//         client_email: process.env.GOOGLE_CLIENT_EMAIL,
//       },
//       scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
//     });

//     const sheets = google.sheets({ version: "v4", auth });

//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId: process.env.SHEET_ID,
//       range: `${eventId}/A`,
//     });

//     const sheetData = response.data.values || [];
//     if (sheetData.length === 0) {
//       return new Response(JSON.stringify([]), { status: 200 });
//     }

//     const headers = sheetData[0];
//     const dataRows = sheetData.slice(1);

//     const sectionIndex = headers.indexOf("SectionTime");
//     const categoryIndex = headers.indexOf("CategoryName");
//     const programIndex = headers.indexOf("ProgramName");
//     const dancer1Index = headers.indexOf("Dancer1Name");
//     const dancer2Index = headers.indexOf("Dancer2Name");

//     if (
//       sectionIndex === -1 ||
//       categoryIndex === -1 ||
//       programIndex === -1 ||
//       dancer1Index === -1 ||
//       dancer2Index === -1
//     ) {
//       return new Response(JSON.stringify([]), { status: 200 });
//     }

//     const participantsWithProgram = dataRows.map((row) => ({
//       SectionTime: row[sectionIndex] || "",
//       CategoryName: row[categoryIndex] || "",
//       ProgramName: row[programIndex] || "",
//       Dancer1Name: row[dancer1Index] || "",
//       Dancer2Name: row[dancer2Index] || "",
//     }));

//     return new Response(JSON.stringify(participantsWithProgram), {
//       status: 200,
//     });
//   } catch (err) {
//     console.error("Error parsing/saving/fetching participants:", err);
//     return new Response(
//       JSON.stringify({ error: "Failed to load participants" }),
//       { status: 500 }
//     );
//   }
// }

import { parseEvent } from "@/utils/parseEvent";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";

type SheetRow = {
  SectionTime: string;
  CategoryName: string;
  ProgramName: string;
  Dancer1Name: string;
  Dancer2Name: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("event");

  if (!eventIdParam) {
    return new Response(JSON.stringify({ error: "Missing event parameter" }), {
      status: 400,
    });
  }

  const eventId = Number(eventIdParam);

  try {
    const parsedEvent = await parseEvent(eventId);

    const sheetRows: SheetRow[] = [];

    for (const section of parsedEvent.Sections) {
      for (const category of section.Categories) {
        for (const reg of category.Registrations) {
          const dancers = reg.Dancers ?? [];
          const programs = reg.Programs ?? [];

          for (const program of programs) {
            sheetRows.push({
              SectionTime: section.SectionName,
              CategoryName: category.CategoryName,
              ProgramName: program.Name ?? "",
              Dancer1Name: dancers[0]?.FullName ?? "",
              Dancer2Name: dancers[1]?.FullName ?? "",
            });
          }
        }
      }
    }

    await saveToGoogleSheet(sheetRows, {
      sheetName: `${eventId}/A`,
      clearBeforeWrite: true,
    });

    return new Response(JSON.stringify(sheetRows), { status: 200 });
  } catch (err) {
    console.error("Error parsing/saving participants:", err);
    return new Response(
      JSON.stringify({ error: "Failed to load participants" }),
      { status: 500 }
    );
  }
}
