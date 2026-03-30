import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { location: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { name, company, locationId } = await request.json();
  if (!name || !company || !locationId) {
    return NextResponse.json({ error: "본부명, 회사, 소속을 모두 입력해주세요." }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({
    where: { name_locationId: { name, locationId: Number(locationId) } },
  });
  if (existing) {
    return NextResponse.json({ error: "해당 소속에 이미 존재하는 본부입니다." }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { name, company, locationId: Number(locationId) },
    include: { location: true },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id, clearTeams } = await request.json();

  if (clearTeams) {
    const cat = await prisma.category.findUnique({ where: { id: Number(id) } });
    if (cat) {
      await prisma.team.updateMany({
        where: { category: cat.name, locationId: cat.locationId },
        data: { category: null },
      });
    }
  }

  await prisma.category.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
