import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const BUCKET = "insa-uploads";

export async function POST(request: NextRequest) {
  // [보안] 인증 확인
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  // MIME 타입 검사
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF 파일만 업로드 가능합니다." }, { status: 400 });
  }

  // 파일 크기 제한 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // [보안] PDF 매직넘버 검증 (%PDF-)
  if (buffer.length < 5 || buffer.toString("utf-8", 0, 5) !== "%PDF-") {
    return NextResponse.json({ error: "유효한 PDF 파일이 아닙니다." }, { status: 400 });
  }

  // [보안] 랜덤 파일명 사용
  const fileName = `resumes/${randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return NextResponse.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }

  // signed URL 생성 (1년 유효)
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);

  return NextResponse.json({
    path: urlData?.signedUrl || fileName,
    name: file.name,
  });
}
