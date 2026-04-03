export interface Competition {
  CompetitionId: string;
  CompetitionName: string;
  DateTo: string;
  CityName: string;
  CoverPhoto: string;
}

export type RawCompetition = {
  CompetitionId?: unknown;
  CompetitionName?: unknown;
  DateTo?: unknown;
  CoverPhoto?: unknown;
  City?: {
    Name?: unknown;
  } | null;
};

export function normalizeCompetition(raw: RawCompetition): Competition | null {
  const id = String(raw.CompetitionId ?? "").trim();
  const name = String(raw.CompetitionName ?? "").trim();
  const dateTo = String(raw.DateTo ?? "").trim();
  const cityName = String(raw.City?.Name ?? "").trim();
  const cover = String(raw.CoverPhoto ?? "").trim();
  // const cover = "";
  // const cover = "/not-existing-image.jpg";

  if (!id || !name || !dateTo) return null;

  return {
    CompetitionId: id,
    CompetitionName: name,
    DateTo: dateTo,
    CityName: cityName,
    CoverPhoto: cover,
  };
}
