import axios from "axios";

export type Dancer = {
  Id: number;
  FullName: string;
};

export type Program = {
  Id: number;
  Name: string;
};

export type City = {
  Name: string;
};

export type Registration = {
  Id?: number;
  ClubName?: string;
  Dancers?: Dancer[];
  Programs?: Program[];
  City?: City;
};

export type Category = {
  Id: number;
  Name: string;
  SectionData?: Record<string, Program[]>;
};

export type PerformanceRow = {
  SectionTime: string;
  CategoryName: string;
  ProgramName: string;
  Dancer1Name: string;
  Dancer1Id: string;
  Dancer2Name: string;
  Dancer2Id: string;
  DancingClub: string;
  City: string;
};

type CompetitionTableResponse = {
  CompetitionName?: string;
  Name?: string;

  Categories?: {
    DateGroups?: Array<{
      Sections?: Array<{
        Id: number;
        Name: string;
      }>;
    }>;
    Categories?: Array<{
      Id: number;
      Name: string;
      SectionData?: Record<string, Program[]>;
    }>;
  };
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
  const response = await api.get<{ Registration?: Registration[] }>(
    "/registration",
    {
      params: { competitionId: eventId, categoryId },
    }
  );

  return response.data.Registration ?? [];
}

export async function parseEvent(eventId: number): Promise<{
  rows: PerformanceRow[];
  eventName: string;
}> {
  const response = await api.get<CompetitionTableResponse>(
    `/competition/${eventId}?mode=table`
  );

  const data = response.data;

  const eventName = String(data.CompetitionName ?? data.Name ?? "").trim();

  const sectionMap = new Map<number, string>();
  const dateGroups = data.Categories?.DateGroups ?? [];

  for (const dateGroup of dateGroups) {
    const sections = dateGroup.Sections ?? [];
    for (const section of sections) {
      sectionMap.set(section.Id, section.Name);
    }
  }

  const rows: PerformanceRow[] = [];
  const categories = data.Categories?.Categories ?? [];

  for (const category of categories) {
    const registrations = await fetchRegistrations(eventId, category.Id);
    if (registrations.length === 0) continue;

    for (const registration of registrations) {
      const dancers = registration.Dancers ?? [];
      const programs = registration.Programs ?? [];

      for (const program of programs) {
        const sectionDataEntries = Object.entries(category.SectionData ?? {});
        const matchedEntry = sectionDataEntries.find(([, programsInSection]) =>
          programsInSection.some(
            (sectionProgram) => sectionProgram.Name === program.Name
          )
        );

        if (!matchedEntry) continue;

        const sectionIdString = matchedEntry[0];
        const sectionTime = sectionMap.get(Number(sectionIdString)) ?? "";

        rows.push({
          SectionTime: sectionTime,
          CategoryName: category.Name,
          ProgramName: program.Name,
          Dancer1Name: dancers[0]?.FullName ?? "",
          Dancer1Id: dancers[0]?.Id?.toString() ?? "",
          Dancer2Name: dancers[1]?.FullName ?? "",
          Dancer2Id: dancers[1]?.Id?.toString() ?? "",
          DancingClub: registration.ClubName ?? "",
          City: registration.City?.Name ?? "",
        });
      }
    }
  }

  return { rows, eventName };
}
