import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

// [보안] 폴백 시크릿 제거 — 환경변수 필수
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다. 서버를 시작할 수 없습니다.");
  }
  return secret;
}

// [보안] secure 플래그를 프로덕션에서 활성화, sameSite strict 적용
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7일
};

interface Session {
  userId: number;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// 세션 쿠키 값 생성 (API Route에서 NextResponse에 직접 설정용)
export function buildSessionCookie(user: { id: number; role: string; name: string }) {
  const payload = JSON.stringify({ userId: user.id, role: user.role, name: user.name });
  const encoded = Buffer.from(payload).toString("base64");
  const signature = sign(encoded);
  return {
    name: "session",
    value: `${encoded}.${signature}`,
    options: COOKIE_OPTIONS,
  };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session");
  if (!cookie) return null;

  const [encoded, signature] = cookie.value.split(".");
  if (!encoded || !signature) return null;

  const expectedSig = sign(encoded);
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
    return payload as Session;
  } catch {
    return null;
  }
}

export function buildDeleteSessionCookie() {
  return {
    name: "session",
    value: "",
    options: { ...COOKIE_OPTIONS, maxAge: 0 },
  };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") redirect("/");
  return session;
}

// [보안] 비밀번호 정책 검증 (KISA 기준: 8자 이상, 영문+숫자+특수문자 조합)
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "비밀번호는 8자 이상이어야 합니다.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "비밀번호에 영문자를 포함해야 합니다.";
  }
  if (!/\d/.test(password)) {
    return "비밀번호에 숫자를 포함해야 합니다.";
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "비밀번호에 특수문자를 포함해야 합니다.";
  }
  return null;
}
