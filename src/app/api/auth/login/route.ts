import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, buildSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const cookie = buildSessionCookie({ id: user.id, role: user.role, name: user.name });
    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasEmployee: !!user.employee,
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
