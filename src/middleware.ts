import { NextRequest, NextResponse } from "next/server";

// [보안] 업로드된 파일(이력서 PDF, 사진) 접근 시 인증 필수
export async function middleware(request: NextRequest) {
  // 업로드 파일 접근 보호
  if (request.nextUrl.pathname.startsWith("/uploads/")) {
    const cookie = request.cookies.get("session");
    if (!cookie) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const [encoded, signature] = cookie.value.split(".");
    if (!encoded || !signature) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      return new NextResponse("서버 설정 오류", { status: 500 });
    }

    // Edge Runtime 호환: Web Crypto API 사용
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

    if (signature !== expectedSig) {
      return new NextResponse("인증이 필요합니다.", { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/uploads/:path*"],
};
