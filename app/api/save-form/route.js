import { NextResponse } from "next/server";
import { saveToGoogleSheet } from "@/utils/saveToGoogleSheet";

export async function POST(req) {
  try {
    const body = await req.json();

    const { eventId, name, items, regNumber, orderType, phone, email } = body;

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const rows = items.map((item) => {
      return {
        DancerName: name,
        Category: item.category,
        Time: item.time,
        RegNumber: regNumber || "",
        OrderType: orderType || "",
        Phone: phone || "",
        Email: email || "",
      };
    });

    await saveToGoogleSheet(rows, {
      sheetName: `${eventId}/B`,
      clearBeforeWrite: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SAVE_FORM_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
