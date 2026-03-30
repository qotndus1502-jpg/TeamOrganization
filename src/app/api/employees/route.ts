import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

// 직원 목록 조회 (팀별 필터 가능, ACTIVE만)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (teamId) where.teamId = Number(teamId);

  const POSITION_ORDER: Record<string, number> = {
    부장: 0, 차장: 1, 과장: 2, 대리: 3, 주임: 4, 사원: 5,
  };

  const employees = await prisma.employee.findMany({
    where,
    include: { team: { include: { location: true } } },
  });

  employees.sort((a, b) => {
    // 팀장/부서장 먼저
    const roleOrder = (r: string) => (r === "팀장" || r === "부서장") ? 0 : 1;
    const rd = roleOrder(a.role) - roleOrder(b.role);
    if (rd !== 0) return rd;
    // 직위 순서
    return (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99);
  });

  return NextResponse.json(employees);
}

// 직원 등록
export async function POST(request: NextRequest) {
  try {
    // [보안] 인증 확인
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();

    const data = {
      name: body.name,
      nameEn: body.nameEn || null,
      email: body.email,
      phone: body.phone || null,
      phoneWork: body.phoneWork || null,
      emailWork: body.emailWork || null,
      position: body.position,
      role: body.role,
      teamId: Number(body.teamId),
      resumePath: body.resumePath || null,
      photoUrl: body.photoUrl || null,
      joinDate: body.joinDate || null,
      resumeData: body.resumeData || null,
      userId: body.userId ? Number(body.userId) : null,
      birthDate: body.birthDate || null,
      address: body.address || null,
      jobCategory: body.jobCategory || null,
      jobRole: body.jobRole || null,
      employmentType: body.employmentType || null,
      entryType: body.entryType || null,
      specialty: body.specialty || null,
      hobby: body.hobby || null,
      taskDetail: body.taskDetail || null,
      skills: body.skills || null,
    };

    // [보안] 본인 등록인지 확인 (다른 userId로 등록 시도 방지)
    if (data.userId && data.userId !== session.userId && !session.role.split(",").includes("ADMIN")) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // userId로 이미 등록된 Employee가 있으면 업데이트
    if (data.userId) {
      const existing = await prisma.employee.findUnique({ where: { userId: data.userId } });
      if (existing) {
        const employee = await prisma.employee.update({
          where: { id: existing.id },
          data,
          include: { team: { include: { location: true } } },
        });
        await auditLog({ action: "UPDATE", userId: session.userId, targetType: "Employee", targetId: employee.id });
        return NextResponse.json(employee);
      }
    }

    const employee = await prisma.employee.create({
      data,
      include: { team: { include: { location: true } } },
    });

    await auditLog({ action: "CREATE", userId: session.userId, targetType: "Employee", targetId: employee.id });

    return NextResponse.json(employee, { status: 201 });
  } catch (err: unknown) {
    // [보안] 내부 에러 메시지 숨김 (DB 스키마 정보 노출 방지)
    console.error("Employee creation error:", err);
    return NextResponse.json({ error: "등록에 실패했습니다." }, { status: 500 });
  }
}
