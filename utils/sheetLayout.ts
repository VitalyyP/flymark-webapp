import { sheets_v4 } from "googleapis";

type EnsureSheetResult = { sheetId: number; created: boolean };

async function getSheetIdByName(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetName: string;
}): Promise<number | null> {
  const { sheets, spreadsheetId, sheetName } = params;

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = sheet?.properties?.sheetId;

  return typeof sheetId === "number" ? sheetId : null;
}

export async function ensureSheetExists(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetName: string;
}): Promise<EnsureSheetResult> {
  const { sheets, spreadsheetId, sheetName } = params;

  const existingId = await getSheetIdByName({
    sheets,
    spreadsheetId,
    sheetName,
  });
  if (existingId !== null) return { sheetId: existingId, created: false };

  const created = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });

  const replies = created.data.replies ?? [];
  const addReply = replies.find((r) => r.addSheet);
  const sheetId = addReply?.addSheet?.properties?.sheetId;

  if (typeof sheetId !== "number") {
    const id2 = await getSheetIdByName({ sheets, spreadsheetId, sheetName });
    if (id2 === null) throw new Error(`Failed to create sheet "${sheetName}"`);
    return { sheetId: id2, created: true };
  }

  return { sheetId, created: true };
}

async function freezeTopRows(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetId: number;
  frozenRowCount: number;
}) {
  const { sheets, spreadsheetId, sheetId, frozenRowCount } = params;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: { frozenRowCount },
            },
            fields: "gridProperties.frozenRowCount",
          },
        },
      ],
    },
  });
}

async function formatHeaderRow(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetId: number;
  headerRowIndex0: number;
  columnCount?: number;
}) {
  const {
    sheets,
    spreadsheetId,
    sheetId,
    headerRowIndex0,
    columnCount = 26,
  } = params;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: headerRowIndex0,
              endRowIndex: headerRowIndex0 + 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    },
  });
}

async function setColumnWidths(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetId: number;
  widths: Array<{ colIndex0: number; widthPx: number }>;
}) {
  const { sheets, spreadsheetId, sheetId, widths } = params;
  if (!widths.length) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: widths.map((w) => ({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: w.colIndex0,
            endIndex: w.colIndex0 + 1,
          },
          properties: { pixelSize: w.widthPx },
          fields: "pixelSize",
        },
      })),
    },
  });
}

export async function setupEventSheetLayout(params: {
  sheets: sheets_v4.Sheets;
  spreadsheetId: string;
  sheetName: string;

  headerRowNumber1Based?: number;
  freezeUpToRow1Based?: number;
  timeColIndex0?: number;
  dataStartRow1Based?: number;
  columnCount?: number;

  columnWidthsPx?: Array<{ colIndex0: number; widthPx: number }>;
}) {
  const {
    sheets,
    spreadsheetId,
    sheetName,

    headerRowNumber1Based = 3,
    freezeUpToRow1Based = 3,
    columnCount = 26,

    columnWidthsPx = [],
  } = params;

  const { sheetId } = await ensureSheetExists({
    sheets,
    spreadsheetId,
    sheetName,
  });

  await freezeTopRows({
    sheets,
    spreadsheetId,
    sheetId,
    frozenRowCount: freezeUpToRow1Based,
  });

  await formatHeaderRow({
    sheets,
    spreadsheetId,
    sheetId,
    headerRowIndex0: headerRowNumber1Based - 1,
    columnCount,
  });

  if (columnWidthsPx.length) {
    await setColumnWidths({
      sheets,
      spreadsheetId,
      sheetId,
      widths: columnWidthsPx,
    });
  }

  return { sheetId };
}
