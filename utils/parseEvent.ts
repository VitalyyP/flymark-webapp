import axios from "axios";

const api = axios.create({
  baseURL: "https://flymark.dance/api",
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "uk,uk-UA;q=0.9,en;q=0.8,en-US;q=0.7",
  },
});

export interface ApiDancer {
  Id: number;
  FullName: string;
}

export interface ApiProgram {
  Id: number;
  Name?: string;
}

export interface ApiRegistration {
  Id: number;
  Dancers?: ApiDancer[];
  Programs?: ApiProgram[];
}

export interface ParsedCategory {
  CategoryId: number;
  CategoryName: string;
  Registrations: ApiRegistration[];
}

export interface ParsedSection {
  SectionName: string;
  Categories: ParsedCategory[];
}

export interface ParsedEvent {
  EventId: number;
  Sections: ParsedSection[];
}

async function fetchRegistrations(
  competitionId: number,
  categoryId: number
): Promise<ApiRegistration[]> {
  try {
    const { data } = await api.get<{ Registration?: ApiRegistration[] }>(
      "/registration",
      {
        params: { competitionId, categoryId },
      }
    );
    return data.Registration ?? [];
  } catch {
    return [];
  }
}

export async function parseEvent(eventId: number): Promise<ParsedEvent> {
  const { data } = await api.get(`/competition/${eventId}`);

  const sections: ParsedSection[] = [];

  for (const sectionBlock of data.Sections ?? []) {
    const sectionName = sectionBlock.Section?.Name ?? "";

    const categories: ParsedCategory[] = [];

    for (const category of sectionBlock.Categories ?? []) {
      const registrations = await fetchRegistrations(data.Id, category.Id);

      categories.push({
        CategoryId: category.Id,
        CategoryName: category.Name,
        Registrations: registrations,
      });
    }

    sections.push({
      SectionName: sectionName,
      Categories: categories,
    });
  }

  return {
    EventId: data.Id,
    Sections: sections,
  };
}
