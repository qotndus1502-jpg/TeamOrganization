import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "prisma", "company-images.json");

async function loadImages(): Promise<Record<string, string>> {
  try {
    const data = await readFile(DATA_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveImages(images: Record<string, string>) {
  await writeFile(DATA_PATH, JSON.stringify(images, null, 2));
}

// GET: 전체 회사 이미지 조회
export async function GET() {
  const images = await loadImages();
  return NextResponse.json(images);
}

// PUT: 회사 이미지 업데이트
export async function PUT(request: NextRequest) {
  const { company, imageUrl } = await request.json();
  if (!company) {
    return NextResponse.json({ error: "company 필수" }, { status: 400 });
  }
  const images = await loadImages();
  if (imageUrl) {
    images[company] = imageUrl;
  } else {
    delete images[company];
  }
  await saveImages(images);
  return NextResponse.json(images);
}
