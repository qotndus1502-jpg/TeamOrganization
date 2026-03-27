import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const { id } = await params;
  const body = await request.json();

  const employee = await prisma.employee.update({
    where: { id: Number(id) },
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
    },
    include: { team: { include: { location: true } } },
  });

  return NextResponse.json(employee);
}

// 직원 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: Number(id) },
    select: { userId: true },
  });

  await prisma.employee.delete({ where: { id: Number(id) } });

  // 연결된 User 계정도 함께 삭제 (같은 이메일로 재가입 가능하도록)
  if (employee?.userId) {
    await prisma.user.delete({ where: { id: employee.userId } });
  }

  return NextResponse.json({ message: "삭제되었습니다." });
}
