import axios from "axios";
import * as cheerio from "cheerio";

async function fetchDancers(categoryId, competitionId) {
  const url = `https://flymark.com.ua/api/registration?categoryId=${categoryId}&competitionId=${competitionId}`;

  try {
    const { data } = await axios.get(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!data || !data.Registration) return [];

    return data.Registration.map((r) => r.Dancers?.map((d) => d.FullName))
      .flat()
      .filter(Boolean);
  } catch (e) {
    console.log(`Error in fetchDancers(${categoryId}):`, e.message);
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

    const table = $("table");
    if (!table.length) {
      console.log("Table not found!");
      return [];
    }

    const headers = [
      "№",
      "Categories",
      "8:30 ",
      "10:30 ",
      "14:30 ",
      "17:30 ",
      "19:30 ",
      "DancerName",
    ];

    const trs = table.find("tbody tr").toArray();
    const rowObjects = [];

    await Promise.all(
      trs.map(async (tr) => {
        const tds = $(tr).find("td");

        let categoryId = null;
        const baseRow = {};

        for (let i = 0; i < tds.length; i++) {
          const td = $(tds[i]);

          if (i === 1) {
            const a = td.find("a[data-ng-click]");
            if (a.length) {
              const attr = a.attr("data-ng-click");
              const match = attr.match(/showDetails\('(\d+)'\)/);
              if (match) categoryId = match[1];
            }
          }

          baseRow[headers[i] || `col_${i}`] = td.text().trim();
        }

        if (categoryId) {
          const dancers = await fetchDancers(categoryId, eventId);
          dancers.forEach((dancer) => {
            rowObjects.push({ ...baseRow, DancerName: dancer });
          });
        }
      })
    );

    const sheetData = [
      headers,
      ...rowObjects.map((row) => headers.map((h) => row[h] || "")),
    ];

    return sheetData;
  } catch (err) {
    console.error("Помилка парсингу:", err.message);
    return [];
  }
}
