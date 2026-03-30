import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, buildSessionCookie, validatePassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, selectedRole } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
    }

    // [보안] 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }

    // [보안] KISA 기준 비밀번호 정책 (8자 이상, 영문+숫자+특수문자)
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 400 });
    }

    // [보안] EXECUTIVE도 승인 대기로 변경 (권한 상승 방지)
    let role = "EMPLOYEE";
    let pendingRole: string | null = null;

    if (selectedRole === "EXECUTIVE") {
      role = "EMPLOYEE";
      pendingRole = "EXECUTIVE";
    } else if (selectedRole === "ADMIN") {
      role = "EMPLOYEE";
      pendingRole = "ADMIN";
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role, pendingRole },
    });

    const cookie = buildSessionCookie({ id: user.id, role: user.role, name: user.name });
    const response = NextResponse.json(
      { id: user.id, email: user.email, name: user.name, role: user.role, pendingRole: user.pendingRole },
      { status: 201 }
    );
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "회원가입 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
