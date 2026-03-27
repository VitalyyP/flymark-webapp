import { NextResponse } from "next/server";
import { getFlymarkCookieHeader } from "@/utils/flymarkAuth";

type Section = {
  Id: number;
};

type ResultProgram = {
  ProgramName: string;
};

type Category = {
  Id: number;
  CategoryName: string;
  ResultProgram?: ResultProgram;
};

type SectionsResponse = {
  Sections: Section[];
};

type CategoriesResponse = {
  Categories: Category[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const targetCategoryName = searchParams.get("categoryName");
  const targetProgramName = searchParams.get("programName");
  const competitionIdStr = searchParams.get("id");

  if (!targetCategoryName || !targetProgramName || !competitionIdStr) {
    return NextResponse.json(
      { error: "Missing required query parameters" },
      { status: 400 }
    );
  }

  const competitionId = Number(competitionIdStr);

  if (isNaN(competitionId)) {
    return NextResponse.json(
      { error: "Invalid competitionId" },
      { status: 400 }
    );
  }

  try {
    const cookieHeader = await getFlymarkCookieHeader();

    const sectionsRes = await fetch(
      `https://flymark.dance/api/competitionStream/${competitionId}/0`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
          referer: `https://flymark.dance/competition/streamdetails/${competitionId}`,
          "accept-language": "uk",
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

    for (const sectionId of sectionIds) {
      const categoriesRes = await fetch(
        `https://flymark.dance/api/competitionStream/${competitionId}/${sectionId}`,
        {
          headers: {
            cookie: cookieHeader,
            accept: "application/json",
            "user-agent": "Mozilla/5.0",
            referer: `https://flymark.dance/competition/streamdetails/${competitionId}`,
            "accept-language": "uk",
          },
        }
      );

      if (!categoriesRes.ok) {
        console.warn(`⚠️ Cannot fetch categories for section ${sectionId}`);
        continue;
      }

      const categoriesData: CategoriesResponse = await categoriesRes.json();

      const found = categoriesData.Categories.find(
        (c) =>
          c.CategoryName === targetCategoryName &&
          c.ResultProgram?.ProgramName === targetProgramName
      );

      if (found) {
        console.log("✅ Found target category");
        return NextResponse.json({ categoryId: found.Id });
      } else {
        console.log(`❌ Target category not found in section ${sectionId}`);
      }
    }

    console.warn("⚠️ Category not found in any section");
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  } catch (e) {
    console.error("💥 Error fetching category:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
