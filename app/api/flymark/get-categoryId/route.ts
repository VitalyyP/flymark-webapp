import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

// Типи для Sections і Categories
type Section = {
  Id: number;
  Name: string;
  Index: number;
  IsActive: boolean;
  IsClosed: boolean;
};

type ResultProgram = {
  Id: number;
  ProgramName: string;
  ProgramId: number;
  ProgramGroupTypes: unknown[];
};

type Category = {
  Id: number;
  StartAt: string;
  Kolo: string;
  CategoryName: string;
  CategoryId: number;
  ResultProgramId: number;
  ResultProgram?: ResultProgram;
  SectionId: number;
  State: number;
  Index: number;
  Dances: unknown[];
  TotalCouples: number;
  TotalRounds: number;
  Redance: boolean;
  IsProgramLinked: boolean;
  DoCalculate: boolean;
  IsCategoryLinked: boolean;
};

type SectionsResponse = {
  Sections: Section[];
};

type CategoriesResponse = {
  Categories: Category[];
};

// Константи
const TARGET_CATEGORY_NAME = "Соло Діти Star Дебют (6-7 років)";
const TARGET_PROGRAM_NAME = "W-C";
const COMPETITION_ID = 6376;

export async function GET() {
  try {
    const cookieHeader = await getFlymarkCookieHeader();

    // Крок 1: отримуємо Sections
    const sectionsRes = await fetch(
      `https://flymark.dance/api/competitionStream/${COMPETITION_ID}/0`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
          referer: `https://flymark.dance/competition/streamdetails/${COMPETITION_ID}`,
        },
      }
    );

    if (!sectionsRes.ok) {
      return NextResponse.json(
        { error: "Cannot fetch sections" },
        { status: 500 }
      );
    }

    const sectionsData: SectionsResponse = await sectionsRes.json();
    const sectionIds = sectionsData.Sections.map((s) => s.Id);

    // Крок 2: проходимо по кожному sectionId
    for (const sectionId of sectionIds) {
      const categoriesRes = await fetch(
        `https://flymark.dance/api/competitionStream/${COMPETITION_ID}/${sectionId}`,
        {
          headers: {
            cookie: cookieHeader,
            accept: "application/json",
            "user-agent": "Mozilla/5.0",
            referer: `https://flymark.dance/competition/streamdetails/${COMPETITION_ID}`,
          },
        }
      );

      if (!categoriesRes.ok) continue;

      const categoriesData: CategoriesResponse = await categoriesRes.json();
      const found = categoriesData.Categories.find(
        (c) =>
          c.CategoryName === TARGET_CATEGORY_NAME &&
          c.ResultProgram?.ProgramName === TARGET_PROGRAM_NAME
      );

      if (found) {
        return NextResponse.json({ categoryId: found.Id });
      }
    }

    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  } catch (e) {
    console.error("Error fetching category:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
