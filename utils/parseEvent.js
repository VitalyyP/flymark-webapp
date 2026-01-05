import axios from "axios";
import * as cheerio from "cheerio";

async function fetchRegistrations(categoryId, competitionId) {
  const url = `https://flymark.com.ua/api/registration?categoryId=${categoryId}&competitionId=${competitionId}`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });
    return data?.Registration ?? [];
  } catch {
    return [];
  }
}

export async function parseEvent(eventId) {
  const url = `https://flymark.com.ua/event/${eventId}`;
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
        "Accept-Language": "uk-UA,uk;q=0.9",
      },
    });

    const $ = cheerio.load(html);
    const table = $("table").first();
    if (!table.length) return [];

    let headers = [];
    table.find("thead tr").each((_, tr) => {
      $(tr)
        .find("th")
        .each((_, th) => {
          const text = $(th).text().replace(/\s+/g, " ").trim();
          if (!/\d{1,2}\s[а-яіїє]+\s?,?\s?[а-яіїє]*/i.test(text)) {
            headers.push(text);
          }
        });
    });

    let divisionCounter = 1;
    headers = headers.map((h) => {
      if (/^\d{2}:\d{2}$/.test(h)) {
        return `${h} відділення ${divisionCounter++}`;
      }
      return h;
    });

    headers.push("Dancer1Name", "Dancer2Name");

    const trs = table.find("tbody tr").toArray();
    const rows = [];
    let rowCounter = 1;

    for (const tr of trs) {
      const tds = $(tr).find("td");
      let categoryId = null;
      const baseRow = {};

      for (let i = 0; i < tds.length; i++) {
        const td = $(tds[i]);
        if (i === 1) {
          const a = td.find("a[data-ng-click]");
          const attr = a.attr("data-ng-click");
          const match = attr?.match(/showDetails\('(\d+)'\)/);
          if (match) categoryId = match[1];
        }
        baseRow[headers[i] ?? `col_${i}`] = td.text().trim();
      }

      if (!categoryId) continue;

      const registrations = await fetchRegistrations(categoryId, eventId);

      for (const reg of registrations) {
        rows.push({
          ...baseRow,
          "№": rowCounter++,
          Dancer1Name: reg.Dancers?.[0]?.FullName || "",
          Dancer2Name: reg.Dancers?.[1]?.FullName || "",
        });
      }
    }

    return [headers, ...rows.map((row) => headers.map((h) => row[h] || ""))];
  } catch {
    return [];
  }
}
