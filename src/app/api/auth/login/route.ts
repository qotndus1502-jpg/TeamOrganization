import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, buildSessionCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // [보안] IP 기반 Rate Limiting (브루트포스 방지)
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      const retryMinutes = Math.ceil(retryAfterMs / 60000);
      return NextResponse.json(
        { error: `로그인 시도 횟수를 초과했습니다. ${retryMinutes}분 후 다시 시도해주세요.` },
        { status: 429 }
      );
    }

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

    // 로그인 성공 시 Rate Limit 초기화
    resetRateLimit(`login:${ip}`);

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
