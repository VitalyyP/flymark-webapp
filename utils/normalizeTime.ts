import { DateTime } from "luxon";

export const normalizeTimeUniversal = (raw?: string): string => {
  if (!raw) return "";

  let dt = null;

  // 2026-04-04 09:00
  // 2026:04:04 09:00
  // 2026-04-04 9:00:00
  if (/^\d{4}[-:]\d{2}[-:]\d{2} \d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [datePart, timePart] = raw.split(" ");

    const normalizedDate = datePart.replace(/:/g, "-");

    dt = DateTime.fromISO(`${normalizedDate}T${timePart}`, {
      zone: "Europe/Kyiv",
      locale: "uk",
    });
  }

  // 4 квіт. 2026 09:00
  // 4 квітня 2026 09:00
  if (!dt) {
    const match = raw.match(
      /^(\d{1,2})\s+([а-яіїєґ.]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})$/i
    );

    if (match) {
      const [, d, monthStr, y, hh, mm] = match;

      const months: Record<string, number> = {
        січ: 1,
        січня: 1,
        лют: 2,
        лютого: 2,
        бер: 3,
        березня: 3,
        квіт: 4,
        квітня: 4,
        трав: 5,
        травня: 5,
        черв: 6,
        червня: 6,
        лип: 7,
        липня: 7,
        серп: 8,
        серпня: 8,
        вер: 9,
        вересня: 9,
        жовт: 10,
        жовтня: 10,
        лист: 11,
        листопада: 11,
        груд: 12,
        грудня: 12,
      };

      const key = monthStr.toLowerCase().replace(".", "");
      const month = months[key];

      if (month) {
        dt = DateTime.fromObject(
          {
            year: Number(y),
            month,
            day: Number(d),
            hour: Number(hh),
            minute: Number(mm),
          },
          { zone: "Europe/Kyiv", locale: "uk" }
        );
      }
    }
  }

  if (!dt || !dt.isValid) return raw;

  return dt.toFormat("d MMMM, H:mm");
};

type ParsedStart = {
  y: number;
  mo: number;
  d: number;
  hh: number;
  min: number;
};

function parseTournamentStartDateTime(raw: string): ParsedStart | null {
  const trimmed = raw.trim();

  const colon = /^(\d{4}):(\d{2}):(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
    trimmed
  );
  if (colon) {
    const [, y, mo, d, hh, mm] = colon;
    return {
      y: Number(y),
      mo: Number(mo),
      d: Number(d),
      hh: Number(hh),
      min: Number(mm),
    };
  }

  const dash = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(
    trimmed
  );
  if (dash) {
    const [, y, mo, d, hh, mm] = dash;
    return {
      y: Number(y),
      mo: Number(mo),
      d: Number(d),
      hh: Number(hh),
      min: Number(mm),
    };
  }

  return null;
}

/** UI: "09:30" only (no date). Accepts sheet / normalized / Flymark time strings. */
export function formatTournamentTimeOnly(raw?: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const parsed = parseTournamentStartDateTime(trimmed);
  if (parsed) {
    return `${String(parsed.hh).padStart(2, "0")}:${String(parsed.min).padStart(
      2,
      "0"
    )}`;
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  const normalized = normalizeTimeUniversal(trimmed);
  const parsedNorm = parseTournamentStartDateTime(normalized);
  if (parsedNorm) {
    return `${String(parsedNorm.hh).padStart(2, "0")}:${String(
      parsedNorm.min
    ).padStart(2, "0")}`;
  }

  const hm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (hm) {
    return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  }

  const dateWithComma =
    /^(\d{1,2})\s+[а-яіїєґ]+\s*,\s*(\d{1,2}):(\d{2})$/i.exec(trimmed);

  if (dateWithComma) {
    const [, , hh, mm] = dateWithComma;
    return `${hh.padStart(2, "0")}:${mm}`;
  }

  return trimmed;
}

/** UI: "09:30, 28 березня" (uk-UA). Accepts sheet / normalized / Flymark time strings. */
export function formatTournamentStartDisplay(raw?: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const parsed = parseTournamentStartDateTime(trimmed);
  if (parsed) {
    return formatUkTimeAndDate(
      parsed.y,
      parsed.mo,
      parsed.d,
      parsed.hh,
      parsed.min
    );
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  return trimmed;
}

/** UI: "28 березня, 09:30" (uk-UA). Same inputs as formatTournamentStartDisplay. */
export function formatTournamentStartDisplayDateFirst(raw?: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const parsed = parseTournamentStartDateTime(trimmed);
  if (parsed) {
    return formatUkDateAndTime(
      parsed.y,
      parsed.mo,
      parsed.d,
      parsed.hh,
      parsed.min
    );
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  return trimmed;
}

function getUkDateAndTimeParts(
  y: number,
  mo: number,
  d: number,
  hh: number,
  min: number
): { datePart: string; timePart: string } {
  const date = new Date(y, mo - 1, d);
  const timePart = `${String(hh).padStart(2, "0")}:${String(min).padStart(
    2,
    "0"
  )}`;

  if (Number.isNaN(date.getTime())) {
    return { datePart: "", timePart };
  }

  const datePart = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(date);

  return { datePart, timePart };
}

function formatUkTimeAndDate(
  y: number,
  mo: number,
  d: number,
  hh: number,
  min: number
): string {
  const { datePart, timePart } = getUkDateAndTimeParts(y, mo, d, hh, min);
  return datePart ? `${timePart}, ${datePart}` : timePart;
}

function formatUkDateAndTime(
  y: number,
  mo: number,
  d: number,
  hh: number,
  min: number
): string {
  const { datePart, timePart } = getUkDateAndTimeParts(y, mo, d, hh, min);
  return datePart ? `${datePart}, ${timePart}` : timePart;
}

export type TournamentStartDisplayModel =
  | { mode: "split"; time: string; date: string }
  | { mode: "timeOnly"; time: string }
  | { mode: "plain"; text: string };

/** For UI that shows time and date separately (e.g. FormattedTime). Mirrors formatTournamentStartDisplay parsing. */
export function getTournamentStartDisplayModel(
  raw?: string
): TournamentStartDisplayModel | null {
  if (!raw?.trim()) return null;

  const trimmed = raw.trim();
  const parsed = parseTournamentStartDateTime(trimmed);
  if (parsed) {
    const { datePart, timePart } = getUkDateAndTimeParts(
      parsed.y,
      parsed.mo,
      parsed.d,
      parsed.hh,
      parsed.min
    );
    if (datePart) {
      return { mode: "split", time: timePart, date: datePart };
    }
    return { mode: "timeOnly", time: timePart };
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return {
      mode: "timeOnly",
      time: `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`,
    };
  }

  return { mode: "plain", text: trimmed };
}
