import { NextResponse } from "next/server";
import { buildDeleteSessionCookie } from "@/lib/auth";

export async function POST() {
  const cookie = buildDeleteSessionCookie();
  const response = NextResponse.json({ message: "로그아웃되었습니다." });
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
