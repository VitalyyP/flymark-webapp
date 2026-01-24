export function formatUaDateFromISO(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  })
    .format(d)
    .replace(" р.", "");
}
