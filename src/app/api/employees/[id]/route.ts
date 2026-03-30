import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

// 직원 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
    include: { team: { include: { location: true } } },
  });

  if (!employee) {
    return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(employee);
}

// 직원 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [보안] 인증 확인
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const empId = Number(id);

  // [보안] 인가 확인: 본인 또는 ADMIN/EXECUTIVE만 수정 가능
  const existing = await prisma.employee.findUnique({ where: { id: empId } });
  if (!existing) {
    return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
  }
  const isOwner = existing.userId != null && existing.userId === session.userId;
  const isPrivileged = session.role === "ADMIN" || session.role === "EXECUTIVE";
  if (!isOwner && !isPrivileged) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();

  const employee = await prisma.employee.update({
    where: { id: empId },
    data: {
      name: body.name,
      nameEn: body.nameEn ?? undefined,
      email: body.email,
      phone: body.phone,
      phoneWork: body.phoneWork ?? undefined,
      emailWork: body.emailWork ?? undefined,
      position: body.position,
      role: body.role,
      teamId: Number(body.teamId),
      resumePath: body.resumePath,
      photoUrl: body.photoUrl,
      joinDate: body.joinDate,
      resumeData: body.resumeData ?? undefined,
      birthDate: body.birthDate ?? undefined,
      address: body.address ?? undefined,
      jobCategory: body.jobCategory ?? undefined,
      jobRole: body.jobRole ?? undefined,
      employmentType: body.employmentType ?? undefined,
      entryType: body.entryType ?? undefined,
      specialty: body.specialty ?? undefined,
      hobby: body.hobby ?? undefined,
      taskDetail: body.taskDetail ?? undefined,
      skills: body.skills ?? undefined,
    },
    include: { team: { include: { location: true } } },
  });

  await auditLog({
    action: "UPDATE",
    userId: session.userId,
    targetType: "Employee",
    targetId: empId,
    detail: JSON.stringify({ fields: Object.keys(body) }),
  });

  return NextResponse.json(employee);
}

// 직원 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // [보안] 인증 확인
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // [보안] ADMIN만 삭제 가능
  if (!session.role.split(",").includes("ADMIN")) {
    return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const empId = Number(id);

  const employee = await prisma.employee.findUnique({
    where: { id: empId },
    select: { userId: true, name: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
  }

  await auditLog({
    action: "DELETE",
    userId: session.userId,
    targetType: "Employee",
    targetId: empId,
    detail: JSON.stringify({ name: employee.name }),
  });

  await prisma.employee.delete({ where: { id: empId } });

  // 연결된 User 계정도 함께 삭제 (같은 이메일로 재가입 가능하도록)
  if (employee?.userId) {
    await prisma.user.delete({ where: { id: employee.userId } });
  }

  return NextResponse.json({ message: "삭제되었습니다." });
}
