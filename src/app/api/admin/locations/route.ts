import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.role.split(",").includes("ADMIN")) return null;
  return session;
}

export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const locations = await prisma.location.findMany({
    include: { _count: { select: { teams: true } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { company, name, type } = await request.json();
  if (!company || !name || !type) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  const location = await prisma.location.create({ data: { company, name, type } });
  return NextResponse.json(location, { status: 201 });
}
