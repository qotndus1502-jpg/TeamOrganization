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
  const teamId = Number(id);
  const { name, locationId, description, imageUrl, imageStyle, category } = await request.json();

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      name, locationId: Number(locationId),
      description: description ?? undefined,
      imageUrl: imageUrl !== undefined ? imageUrl : undefined,
      imageStyle: imageStyle !== undefined ? imageStyle : undefined,
      category: category !== undefined ? category : undefined,
    },
    include: { location: true },
  });

  await auditLog({ action: "UPDATE", userId: session.userId, targetType: "Team", targetId: teamId });

  return NextResponse.json(team);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const teamId = Number(id);

  const empCount = await prisma.employee.count({ where: { teamId } });
  if (empCount > 0) {
    return NextResponse.json({ error: "소속된 직원이 있어 삭제할 수 없습니다." }, { status: 400 });
  }

  await auditLog({ action: "DELETE", userId: session.userId, targetType: "Team", targetId: teamId });

  await prisma.team.delete({ where: { id: teamId } });
  return NextResponse.json({ message: "삭제되었습니다." });
}
