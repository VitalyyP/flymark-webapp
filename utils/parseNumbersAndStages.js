const testNumbers = [
  { registrationNumber: "39", dancerName: "Сундирьова Роксолана" },
  { registrationNumber: "61", dancerName: "Нощенко Єлизавета" },
  { registrationNumber: "181", dancerName: "Тищенко Дар'я" },
  { registrationNumber: "285", dancerName: "Лимаренко Маліка" },
  { registrationNumber: "290", dancerName: "Слапигіна Мілана" },
  { registrationNumber: "302", dancerName: "Котенко Іванна" },
  { registrationNumber: "325", dancerName: "Риженко Діана" },
  { registrationNumber: "98", dancerName: "Скабелка Єлизавета" },
  { registrationNumber: "35", dancerName: "Тимошенко Марина" },
  { registrationNumber: "269", dancerName: "Ковальова Софія" },
  { registrationNumber: "194", dancerName: "Пєтіна Варвара" },
  { registrationNumber: "268", dancerName: "Оранська Аліна" },
  { registrationNumber: "287", dancerName: "Болонська Юлія" },
  { registrationNumber: "190", dancerName: "Петренко Гліб" },
];
const testrEvents = [
  {
    eventName: "Захід 1",
    registrationNumbers: ["39", "61", "190", "268", "269", "290", "302"],
  },
  {
    eventName: "Захід 2",
    registrationNumbers: ["35", "98", "181", "194", "285", "287", "325"],
  },
];
import puppeteer from "puppeteer";

const EMAIL = process.env.FLYMARK_LOGIN;
const PASSWORD = process.env.FLYMARK_PASSWORD;
// const EVENT_URL = "https://flymark.com.ua/competition/streamdetails/408355";
const EVENT_URL = "https://flymark.com.ua/competition/streamdetails/408437";
console.log("LOGIN:", process.env.FLYMARK_LOGIN);

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    // headless: false,
    // slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // 1️⃣ Login
    await page.goto(
      "https://flymark.dance/identity/account/login?returnUrl=&returnDomain=https://flymark.com.ua&language=uk",
      {
        waitUntil: "networkidle2",
      }
    );

    await page.waitForSelector("#Input_Email", { timeout: 15000 });
    await page.waitForSelector("#Input_Password", { timeout: 15000 });

    await page.type("#Input_Email", EMAIL, { delay: 30 });
    await page.type("#Input_Password", PASSWORD, { delay: 30 });

    await Promise.all([
      page.click('input[type="submit"][value="Вхід"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    console.log("✅ Logged in");

    // 2️⃣ Open event page
    await page.goto(EVENT_URL, { waitUntil: "networkidle2" });

    const data = await page.evaluate(() => {
      // 1️⃣ Парсимо таблицю
      const rows = Array.from(document.querySelectorAll("table tbody tr"));

      const participants = rows
        .map((row) => {
          const cells = row.querySelectorAll("td");

          const regNum = cells[0]?.innerText.trim();
          // const name = cells[1]?.innerText.trim();
          const name = cells[2]?.innerText.trim();

          if (!regNum || regNum === "№" || regNum === "?" || !name) {
            return null;
          }

          return {
            registrationNumber: regNum,
            dancerName: name,
          };
        })
        .filter(Boolean);

      // 2️⃣ Парсимо додаткові “Захід” рядки
      const events = Array.from(document.querySelectorAll("b"))
        .map((b) => {
          const container = b.parentElement;
          if (!container) return null;

          const eventName = b.innerText.replace(":", "").trim();

          // ✅ залишаємо тільки "Захід N"
          if (!/^Захід\s+\d+$/.test(eventName)) {
            return null;
          }

          const numbers = Array.from(container.querySelectorAll("span"))
            .map((s) => s.innerText.replace(/[,;]/g, "").trim())
            .filter(Boolean);

          if (numbers.length === 0) return null;

          return {
            eventName,
            registrationNumbers: numbers,
          };
        })
        .filter(Boolean);

      return {
        participants,
        events,
      };
    });

    console.log(data.participants);
    console.log(data.events);

    await browser.close();
  } catch (err) {
    console.error("❌ Error:", err);
    await browser.close();
  }
})();
