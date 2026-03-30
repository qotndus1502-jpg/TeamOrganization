import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(null);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { employee: { select: { id: true, teamId: true, team: { select: { location: { select: { company: true } } } } } } },
  });

  if (!user) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    pendingRole: user.pendingRole,
    hasEmployee: !!user.employee,
    employeeId: user.employee?.id || null,
    teamId: user.employee?.teamId || null,
    teamCompany: user.employee?.team?.location?.company || null,
  });
}
