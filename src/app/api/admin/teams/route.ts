import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const teams = await prisma.team.findMany({
    include: {
      location: true,
      _count: { select: { employees: true } },
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { name, locationId, description, imageUrl, category } = await request.json();
  if (!name || !locationId) {
    return NextResponse.json({ error: "팀명과 소속 거점을 입력해주세요." }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: { name, locationId: Number(locationId), description: description || null, imageUrl: imageUrl || null, category: category || null },
    include: { location: true },
  });
  return NextResponse.json(team, { status: 201 });
}
