import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const BUCKET = "insa-uploads";

// [보안] 이미지 매직넘버 검증
const IMAGE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function verifyImageSignature(buffer: Buffer, mimeType: string): boolean {
  const sig = IMAGE_SIGNATURES[mimeType];
  if (!sig) return false;
  if (buffer.length < sig.length) return false;
  return sig.every((byte, i) => buffer[i] === byte);
}

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

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "JPG, PNG, WebP, GIF 파일만 업로드 가능합니다." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // [보안] 매직넘버 검증 (MIME 위조 방지)
  if (!verifyImageSignature(buffer, file.type)) {
    return NextResponse.json({ error: "파일 내용이 선언된 형식과 일치하지 않습니다." }, { status: 400 });
  }

  // [보안] 서버에서 확장자 결정
  const ext = MIME_TO_EXT[file.type] || "jpg";
  const fileName = `photos/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Supabase photo upload error:", error);
    return NextResponse.json({ error: "사진 업로드에 실패했습니다." }, { status: 500 });
  }

  // signed URL 생성 (1년 유효)
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);

  return NextResponse.json({ url: urlData?.signedUrl || fileName });
}
