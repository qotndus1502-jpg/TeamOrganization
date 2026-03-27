import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET || "fallback-dev-secret";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
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
  return createHmac("sha256", SECRET).update(payload).digest("hex");
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
