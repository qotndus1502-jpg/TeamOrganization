import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT: update user role / approve or reject pending role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const body = await request.json();
  const { action, role: newRole } = body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  // Prevent admin from modifying their own role
  if (userId === session.userId) {
    return NextResponse.json({ error: "자신의 역할은 변경할 수 없습니다." }, { status: 400 });
  }

  if (action === "approve") {
    // Approve pending role
    if (!user.pendingRole) {
      return NextResponse.json({ error: "승인 대기 중인 요청이 없습니다." }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: user.pendingRole, pendingRole: null },
    });
    return NextResponse.json({ id: updated.id, role: updated.role, pendingRole: updated.pendingRole });
  }

  if (action === "reject") {
    // Reject pending role
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { pendingRole: null },
    });
    return NextResponse.json({ id: updated.id, role: updated.role, pendingRole: updated.pendingRole });
  }

  if (action === "changeRole" && newRole) {
    // Direct role change by admin
    const validRoles = ["ADMIN", "EMPLOYEE", "EXECUTIVE"];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole, pendingRole: null },
    });
    return NextResponse.json({ id: updated.id, role: updated.role, pendingRole: updated.pendingRole });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
