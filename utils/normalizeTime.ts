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
