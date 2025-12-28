import puppeteer from "puppeteer";

const EMAIL = process.env.FLYMARK_LOGIN;
const PASSWORD = process.env.FLYMARK_PASSWORD;
// const EVENT_URL = "https://flymark.com.ua/competition/streamdetails/408355";
const EVENT_URL = "https://flymark.com.ua/competition/streamdetails/408359";
console.log("LOGIN:", process.env.FLYMARK_LOGIN);

(async () => {
  const browser = await puppeteer.launch({
    // headless: "new",
    headless: false,
    slowMo: 50,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // 1️⃣ Login
    // await page.goto("https://flymark.com.ua/login", {
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

    // 3️⃣ Parse table
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("table tbody tr"));

      return rows
        .map((row) => {
          const cells = row.querySelectorAll("td");

          if (
            !cells.length ||
            cells[0].innerText.trim() === "№" ||
            cells[0].innerText.trim() === "?"
          ) {
            return null;
          }

          return {
            registrationNumber: cells[0]?.innerText.trim(),
            dancerName: cells[2]?.innerText.trim(),
          };
        })
        .filter(Boolean);
    });

    console.log("🎯 Parsed rows:", data.length);
    console.log(data);

    await browser.close();
  } catch (err) {
    console.error("❌ Error:", err);
    await browser.close();
  }
})();
