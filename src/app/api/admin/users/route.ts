import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: list users (optionally filter by pendingRole)
export async function GET() {
  const session = await getSession();
  if (!session || !session.role.split(",").includes("ADMIN")) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      pendingRole: true,
      createdAt: true,
      employee: { select: { id: true, name: true, position: true, team: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}
