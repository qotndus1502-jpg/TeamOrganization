import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function checkAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const { company, name, type } = await request.json();

  const location = await prisma.location.update({
    where: { id: Number(id) },
    data: { company, name, type },
  });
  return NextResponse.json(location);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;

  const teamCount = await prisma.team.count({ where: { locationId: Number(id) } });
  if (teamCount > 0) {
    return NextResponse.json({ error: "소속된 팀이 있어 삭제할 수 없습니다." }, { status: 400 });
  }

  await prisma.location.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: "삭제되었습니다." });
}
