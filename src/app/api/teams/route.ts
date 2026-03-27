import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 팀 목록 조회 (location 타입별 필터 가능)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationType = searchParams.get("type"); // "HQ" or "SITE"
  const company = searchParams.get("company");

  const where: Record<string, unknown> = {};
  if (locationType) where.location = { type: locationType };
  if (company) where.location = { ...((where.location as object) || {}), company };

  const teams = await prisma.team.findMany({
    where,
    include: {
      location: true,
      _count: { select: { employees: true } },
      employees: {
        where: { role: { in: ["팀장", "부서장"] }, status: "ACTIVE" },
        select: { id: true, name: true, position: true, role: true, photoUrl: true },
        take: 1,
      },
    },
    orderBy: { location: { type: "asc" } },
  });

  // employees 배열에서 leader 필드로 변환
  const result = teams.map(({ employees, ...team }) => ({
    ...team,
    leader: employees[0] || null,
  }));

  return NextResponse.json(result);
}
