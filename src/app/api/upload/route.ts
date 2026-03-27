import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  // PDF만 허용
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF 파일만 업로드 가능합니다." }, { status: 400 });
  }

  // 파일 크기 제한 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 고유한 파일명 생성
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
  const fileName = `${timestamp}_${sanitizedName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);

  return NextResponse.json({
    path: `/uploads/${fileName}`,
    name: file.name,
  });
}
