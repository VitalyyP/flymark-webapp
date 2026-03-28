export const normalizeTimeUniversal = (raw?: string): string => {
  if (!raw) return "";

  // Google Sheets "YYYY-MM-DD HH:MM:SS" / "YYYY-MM-DD H:MM:SS"
  if (/^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    const [datePart, timePart] = raw.split(" ");
    const dateNormalized = datePart.replace(/-/g, ":");
    const lastColon = timePart.lastIndexOf(":");
    let timeNormalized =
      lastColon > 0 ? timePart.slice(0, lastColon) : timePart;

    const [hh, mm] = timeNormalized.split(":");
    timeNormalized = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;

    return `${dateNormalized} ${timeNormalized}`;
  }

  // Flymark "HH.MM"
  if (/^\d{1,2}\.\d{1,2}$/.test(raw)) {
    const [hh, mm] = raw.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  return raw;
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

  const colon =
    /^(\d{4}):(\d{2}):(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
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

  const dash =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
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
    return `${String(parsed.hh).padStart(2, "0")}:${String(parsed.min).padStart(2, "0")}`;
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  const normalized = normalizeTimeUniversal(trimmed);
  const parsedNorm = parseTournamentStartDateTime(normalized);
  if (parsedNorm) {
    return `${String(parsedNorm.hh).padStart(2, "0")}:${String(parsedNorm.min).padStart(2, "0")}`;
  }

  const hm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (hm) {
    return `${hm[1].padStart(2, "0")}:${hm[2]}`;
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
  const timePart = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

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
