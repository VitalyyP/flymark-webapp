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

/** UI: "09:30, 28 березня" (uk-UA). Accepts sheet / normalized / Flymark time strings. */
export function formatTournamentStartDisplay(raw?: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();

  const withColonDate =
    /^(\d{4}):(\d{2}):(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (withColonDate) {
    const [, y, mo, d, hh, mm] = withColonDate;
    return formatUkTimeAndDate(
      Number(y),
      Number(mo),
      Number(d),
      Number(hh),
      Number(mm)
    );
  }

  const withDashDate =
    /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed);
  if (withDashDate) {
    const [, y, mo, d, hh, mm] = withDashDate;
    return formatUkTimeAndDate(
      Number(y),
      Number(mo),
      Number(d),
      Number(hh),
      Number(mm)
    );
  }

  if (/^\d{1,2}\.\d{1,2}$/.test(trimmed)) {
    const [hh, mm] = trimmed.split(".");
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  }

  return trimmed;
}

function formatUkTimeAndDate(
  y: number,
  mo: number,
  d: number,
  hh: number,
  min: number
): string {
  const date = new Date(y, mo - 1, d);
  if (Number.isNaN(date.getTime())) {
    return `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const datePart = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(date);
  const timePart = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  return `${timePart}, ${datePart}`;
}
