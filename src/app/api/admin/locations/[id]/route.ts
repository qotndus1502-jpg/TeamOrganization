import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

async function checkAdmin() {
  const session = await getSession();
  if (!session || !session.role.split(",").includes("ADMIN")) return null;
  return session;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const locId = Number(id);
  const { company, name, type } = await request.json();

  const location = await prisma.location.update({
    where: { id: locId },
    data: { company, name, type },
  });

  await auditLog({ action: "UPDATE", userId: session.userId, targetType: "Location", targetId: locId });

  return NextResponse.json(location);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const locId = Number(id);

  const teamCount = await prisma.team.count({ where: { locationId: locId } });
  if (teamCount > 0) {
    return NextResponse.json({ error: "소속된 팀이 있어 삭제할 수 없습니다." }, { status: 400 });
  }

  await auditLog({ action: "DELETE", userId: session.userId, targetType: "Location", targetId: locId });

  await prisma.location.delete({ where: { id: locId } });
  return NextResponse.json({ message: "삭제되었습니다." });
}
