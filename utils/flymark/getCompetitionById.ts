export type FlymarkCompetition = {
  Id: number;
  CoverPhoto: string;
  CompetitionTypeText: string;
  Name: string;
  DateFrom: string;
  DateTo: string;
  FullDate: string;
  RegistrationEndDate: string;
  CityName: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function getCompetitionById(
  id: string | number
): Promise<FlymarkCompetition | null> {
  const competitionId =
    typeof id === "number" ? id : Number.parseInt(String(id), 10);

  if (!Number.isFinite(competitionId)) return null;

  const res = await fetch(
    `https://flymark.dance/api/competition/${competitionId}?mode=table`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) return null;

  const data: unknown = await res.json();

  if (!isRecord(data)) return null;

  const Id = toNumber(data.Id);
  if (Id === null) return null;

  return {
    Id,
    CoverPhoto: toString(data.CoverPhoto),
    CompetitionTypeText: toString(data.CompetitionTypeText),
    Name: toString(data.Name),
    DateFrom: toString(data.DateFrom),
    DateTo: toString(data.DateTo),
    FullDate: toString(data.FullDate),
    RegistrationEndDate: toString(data.RegistrationEndDate),
    CityName: toString(data.CityName),
  };
}
