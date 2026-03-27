import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, buildSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password, name, selectedRole } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 400 });
  }

  // Role logic:
  // - EXECUTIVE: set directly
  // - ADMIN request: set role=EMPLOYEE, pendingRole=ADMIN (needs approval)
  // - EMPLOYEE (default): set directly
  let role = "EMPLOYEE";
  let pendingRole: string | null = null;

  if (selectedRole === "EXECUTIVE") {
    role = "EXECUTIVE";
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
}
