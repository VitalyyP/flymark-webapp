import axios from "axios";

const api = axios.create({
  baseURL: "https://flymark.dance/api",
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "uk,uk-UA;q=0.9,en;q=0.8,en-US;q=0.7",
  },
});

interface ApiDancer {
  Id: number;
  FullName: string;
}

interface ApiRegistration {
  Id: number;
  Dancers?: ApiDancer[];
}

interface CategoryRow {
  SectionTime: string;
  CategoryName: string;
  Dancer1Name?: string;
  Dancer2Name?: string;
}

export async function fetchRegistrations(
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

export async function parseEvent(eventId: number): Promise<CategoryRow[]> {
  const { data } = await api.get(`/competition/${eventId}`);

  const rows: CategoryRow[] = [];

  for (const sectionBlock of data.Sections ?? []) {
    const sectionName = sectionBlock.Section?.Name ?? "";

    for (const category of sectionBlock.Categories ?? []) {
      const registrations = await fetchRegistrations(data.Id, category.Id);

      for (const reg of registrations) {
        const dancers = reg.Dancers ?? [];

        rows.push({
          SectionTime: sectionName,
          CategoryName: category.Name,
          Dancer1Name: dancers[0]?.FullName,
          Dancer2Name: dancers[1]?.FullName,
        });
      }
    }
  }

  return rows;
}
