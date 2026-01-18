import axios from "axios";

export type Dancer = {
  Id: number;
  FullName: string;
};

export type Program = {
  Id: number;
  Name: string;
};

export type Registration = {
  Id: number;
  Dancers?: Dancer[];
  Programs?: Program[];
};

export type Category = {
  Id: number;
  Name: string;
  SectionData?: Record<string, Program[]>;
};

export type Section = {
  Id: number;
  Name: string;
};

export type PerformanceRow = {
  SectionTime: string;
  CategoryName: string;
  ProgramName: string;
  Dancer1Name: string;
  Dancer2Name: string;
};

const api = axios.create({
  baseURL: "https://flymark.dance/api",
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "uk,uk-UA;q=0.9,en;q=0.8,en-US;q=0.7",
  },
});

async function fetchRegistrations(
  eventId: number,
  categoryId: number
): Promise<Registration[]> {
  const { data } = await api.get<{ Registration?: Registration[] }>(
    "/registration",
    {
      params: { competitionId: eventId, categoryId },
    }
  );
  return data.Registration ?? [];
}

export async function parseEvent(eventId: number): Promise<PerformanceRow[]> {
  const { data } = await api.get(`/competition/${eventId}?mode=table`);

  const sectionMap = new Map<number, string>();
  for (const dg of data.Categories?.DateGroups ?? []) {
    for (const s of dg.Sections ?? []) {
      sectionMap.set(s.Id, s.Name);
    }
  }

  const rows: PerformanceRow[] = [];

  for (const category of data.Categories?.Categories ?? []) {
    const registrations = await fetchRegistrations(eventId, category.Id);
    if (!registrations.length) continue;

    for (const reg of registrations) {
      const dancers = reg.Dancers ?? [];
      for (const program of reg.Programs ?? []) {
        const entry = Object.entries(category.SectionData ?? {}).find(
          ([_, programs]) =>
            (programs as Program[]).some((p) => p.Name === program.Name)
        );

        if (!entry) continue;

        const sectionIdStr = entry[0];
        const sectionTime = sectionMap.get(Number(sectionIdStr)) ?? "";

        rows.push({
          SectionTime: sectionTime,
          CategoryName: category.Name,
          ProgramName: program.Name,
          Dancer1Name: dancers[0]?.FullName ?? "",
          Dancer2Name: dancers[1]?.FullName ?? "",
        });
      }
    }
  }

  return rows;
}
