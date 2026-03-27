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
  const { name, locationId, description, imageUrl, imageStyle } = await request.json();

  const team = await prisma.team.update({
    where: { id: Number(id) },
    data: {
      name, locationId: Number(locationId),
      description: description ?? undefined,
      imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      imageStyle: imageStyle !== undefined ? imageStyle : undefined,
    },
    include: { location: true },
  });
  return NextResponse.json(team);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;

  const empCount = await prisma.employee.count({ where: { teamId: Number(id) } });
  if (empCount > 0) {
    return NextResponse.json({ error: "소속된 직원이 있어 삭제할 수 없습니다." }, { status: 400 });
  }

  await prisma.team.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: "삭제되었습니다." });
}
